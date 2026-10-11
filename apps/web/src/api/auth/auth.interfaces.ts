export interface IEmailSignInInput {
  email: string;
  password: string;
}

export interface IEmailSignUpInput extends IEmailSignInInput {
  name: string;
}

export interface IAuthClientError {
  status: number;
  message?: string;
}
