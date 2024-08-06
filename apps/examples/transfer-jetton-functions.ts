import { Address, beginCell, SendMode } from '@ton/core';
import { mnemonicToWalletKey } from '@ton/crypto';
import { TonClient } from '@ton/ton';
import { getHttpEndpoint } from '@orbs-network/ton-access';
import {
  address,
  addrNone,
  bounce,
  bounced,
  coins,
  comment,
  createdAt,
  createdLt,
  externalMessageCode,
  extraCurrency,
  forwardingFee,
  ihr,
  ihrFee,
  internalMessageCode,
  isInitMessage,
  maybe,
  operationCode,
  queryId,
  ref,
  sendMode,
  signed,
  cell,
  seqno,
  setV4R2,
  subWallet,
  validUntil,
  nanoCoins
} from '../../libs/cell-builder/src/cell';

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

  const seqnoValue = await getSeqno(clientV2, myWalletWithJettons);

  // формируем тело внешнего сообщения для нашего кошелька
  const externalMessageBody = cell(
    subWallet(),
    validUntil(),
    seqno(seqnoValue),
    setV4R2(),
    sendMode(SendMode.PAY_GAS_SEPARATELY, SendMode.IGNORE_ERRORS),
    ref(
      cell(
        internalMessageCode(),
        ihr(false),
        bounce(false),
        bounced(false),
        addrNone(),
        address(jettonWalletAddress),
        coins(internalFeeTon),
        extraCurrency(),
        ihrFee(0),
        forwardingFee(0),
        createdAt(0),
        createdLt(0),
        isInitMessage(false),
        maybe(
          ref,
          cell(
            operationCode(JettonOperationCode.Transfer),
            queryId(),
            coins(jettonAmount),
            address(recipientAddress),
            address(myWalletWithJettons),
            maybe(ref, cell()),
            nanoCoins(1),
            maybe(ref, cell(comment('Hello, JetTON!')))
          )
        )
      )
    )
  );

  // формируем команду (внешнее сообщение) для кошелька
  const externalMessage = cell(
    externalMessageCode(),
    addrNone(),
    address(myWalletWithJettons),
    coins(externalFeeTon),
    isInitMessage(false),
    maybe(ref, cell(signed(externalMessageBody, keyPair.secretKey)))
  );

  // отправляем транзакцию
  await clientV2.sendFile(externalMessage.toBoc());

  console.dir({ seqnoValue });
};

// запускаем
run().catch(console.error);
