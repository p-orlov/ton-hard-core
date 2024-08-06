import { Address, beginCell, toNano } from '@ton/core';
import { mnemonicToWalletKey, sign } from '@ton/crypto';
import { TonClient } from '@ton/ton';
import { getHttpEndpoint } from '@orbs-network/ton-access';

// -- входные данные --
// кошелек с жетонами, котоые мы хотим перевести
const myWalletWithJettonsUserFriendly = '<...>';
// сид фраза кошелька с жетонами
const myWalletWithJettonsMnemonic = '<...>';
// адрес контракта жетона
const jettonAddressUserFriendly = '<...>';
// кошелек получателя
const recipientAddressUserFriendly = '<...>';
// количество жетонов для перевода
const jettonAmount = 42;
// количество тон на оплату комиссии внешнего сообщения
const externalFeeTon = '0.1';
// количество тон на оплату комиссии внутреннего сообщения
const internalFeeTon = '0.05';

// -- всякие нужные преобразования --
const mnemonicArray = myWalletWithJettonsMnemonic.split(' ');
const myWalletWithJettons = Address.parse(myWalletWithJettonsUserFriendly);
const jettonAddress = Address.parse(jettonAddressUserFriendly);
const recipientAddress = Address.parse(recipientAddressUserFriendly);

// -- константы --
export const DEFAULT_SUBWALLET_ID = 698983191; // id сабкошелька по умолчанию

// -- вспомогательные функции --

// жетоны хранятся на отдельном кошельке, который ссылается на наш основной кошелек
// поэтому нам нужно получить адрес кошелька с жетонами
// получаем адрес жетон-кошелька
const getJettonWalletAddress = async (
  clientV2: TonClient,
  jettonContract: Address,
  wallet: Address
) => {
  const result = await clientV2.runMethod(
    jettonContract,
    'get_wallet_address',
    [
      {
        type: 'slice',
        cell: beginCell().storeAddress(wallet).endCell()
      }
    ]
  );

  return result.stack.readAddress();
};

// получаем seqno кошелька
// Seqno is one way to prevent Replay Attacks.
// что бы это не значило, перед каждой транзакцией нужно узнавать seqno кошелька и присылать его в запросе. после транзакции seqno увеличивается на 1
const getSeqno = async (clientV2: TonClient, address: Address) => {
  const result = await clientV2.runMethod(address, 'seqno', []);
  return result.stack.readNumber();
};

// коды комманд для работы с жетонами
export const JettonOperationCode = {
  Transfer: 0x0f8a7ea5
} as const;

// функции для работы с validUntil
export const ValidUntil = {
  now: () => Math.floor(Date.now() / 1000),
  seconds: (ttl: number) => ValidUntil.now() + ttl,
  default: () => ValidUntil.seconds(1000)
};

// -- основная логика --
const run = async () => {
  // конфигуируем апи клиент
  const endpointV2 = await getHttpEndpoint({ network: 'testnet' });
  const clientV2 = new TonClient({ endpoint: endpointV2 });

  // получаем ключи основного кошелька
  const keyPair = await mnemonicToWalletKey(mnemonicArray);
  // получаем адрес жетон-кошелька
  const jettonWalletAddress = await getJettonWalletAddress(
    clientV2,
    jettonAddress,
    myWalletWithJettons
  );

  const seqno = await getSeqno(clientV2, myWalletWithJettons);

  // формируем тело внешнего сообщения для нашего кошелька
  const externalMessageBody = beginCell()
    .storeUint(DEFAULT_SUBWALLET_ID, 32) // указываем id сабкошелька. не понятно как его выбирать, так что используем дефолтный
    .storeUint(ValidUntil.default(), 32) // добавляем дефолтный validUntil
    .storeUint(seqno, 32) // добавляем seqno
    .storeUint(0, 8) // эта строчка показывает что сообщение для кошелька v4r2
    .storeUint(3, 8) // todo store mode of our internal transaction, хз что это
    .storeRef(
      // добавляем ссылку на внутреннее сообщение,которое должен получить жетон-кошелек
      beginCell()
        .storeUint(0, 1) // $0 <-- код показывает что это internal message
        .storeBit(1) // todo IHR Disabled, хз что это
        .storeBit(0) // todo bounce, хз что это
        .storeBit(0) // todo bounced, хз что это
        .storeUint(0, 2) // todo src -> addr_none, хз что это
        .storeAddress(jettonWalletAddress) // адрес получателя внутреннего сообщения - жетон-кошелек
        .storeCoins(toNano(internalFeeTon)) // комиссия на пересылку жетонов
        .storeBit(0) // todo Extra currency, хз что это
        .storeCoins(0) // todo IHR Fee, хз что это
        .storeCoins(0) // todo Forwarding Fee, хз что это
        .storeUint(0, 64) // Logical time of creation - время создания сообщения, я так пониаю можно не указывать
        .storeUint(0, 32) // UNIX time of creation - timestamp создания сообщения, я так пониаю можно не указывать
        .storeBit(0) // указываем, что это не инициализирующее сообщение
        .storeBit(1) // указываем, что дальше будет ссылка на ячейку с данными тела сообщения
        .storeRef(
          // тело внутреннего сообщения
          beginCell()
            .storeUint(JettonOperationCode.Transfer, 32) // код операции - пересылка жетонов
            .storeUint(0, 64) // queryid - идентификатор запроса, я так понимаю можно не указывать
            .storeCoins(toNano(jettonAmount)) // количество жетонов для пересылки
            .storeAddress(recipientAddress) // адрес получателя жетонов (обычный кошелек, не жетон-кошелек)
            .storeAddress(myWalletWithJettons) // адрес для возврата лишних тонов
            .storeBit(1) // указываем, что дальше будет ссылка на ячейку сcustomPayload, что бы это не значило
            .storeRef(beginCell().endCell()) // customPayload - пустая ячейка
            .storeCoins(1) // todo forwardTonAmount, хз что это, указываем 1 - прокатит
            .storeBit(1) // указываем, что дальше будет ссылка на ячейку с комментарием
            .storeRef(
              beginCell()
                .storeUint(0, 32) // 0 чтобы показать что это будет текстовый коммент
                .storeStringTail('Hello, JetTON!') // сам коммент
                .endCell()
            )
            .endCell()
        )
        .endCell()
    )
    .endCell();

  // тело внешнего сообщения нужно подписать, чтобы кошелек понял, что оно от владельца
  const signature = sign(externalMessageBody.hash(), keyPair.secretKey);

  // формируем команду (внешнее сообщение) для кошелька
  const externalMessage = beginCell()
    //заголовки внешнего сообщения
    .storeBuilder(
      beginCell()
        .storeUint(2, 2) // $10 <-- код показывает что это external message
        .storeAddress(null) // хз что за адрес, но для external message он null
        .storeAddress(myWalletWithJettons) //адрес получателя сообщения.в нашем случае это адрес кошелька, с которого мы хотим перевести жетоны
        .storeCoins(toNano(externalFeeTon)) //тон на оплату комиссии внешнего сообщения
    )
    // инфа про тело сообщения
    .storeBit(0) // это не инициализирующее сообщение
    .storeBit(1) //показывает будет дальше ссылка на ячейку или данные тела сообщения будут дальше в этой ячейке. 1 да, 0 нет
    // тело сообщения
    .storeRef(
      beginCell()
        .storeBuffer(signature) // добавляем подпись в тело сообщения, чтобы кошелек понял, что оно от владельца
        .storeBuilder(externalMessageBody.asBuilder()) // добавляем данные тела прямо в эту ячейку безо всяких ссылок
        .endCell()
    )
    .endCell();

  // отправляем транзакцию
  await clientV2.sendFile(externalMessage.toBoc());

  console.dir({ seqno });
};

// запускаем
run().catch(console.error);
