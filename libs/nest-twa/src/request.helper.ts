export const RequestHelper = {
  getBearerToken: (request: any): string | null => {
    const authorization = request.headers.authorization;

    return authorization?.split(' ')[1] || null;
  }
};
