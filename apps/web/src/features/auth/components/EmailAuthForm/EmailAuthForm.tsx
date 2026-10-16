import type { FormEvent } from "react";
import { useState } from "react";

import { useEmailSignInMutation, useEmailSignUpMutation } from "@/api/auth/auth.mutations";
import { apiErrorMessage } from "@/api/client/client.helpers";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { EAuthMode } from "@/features/auth/auth.enums";
import {
  EMAIL_AUTH_EMAIL_LABEL,
  EMAIL_AUTH_NAME_LABEL,
  EMAIL_AUTH_PASSWORD_AUTOCOMPLETE,
  EMAIL_AUTH_PASSWORD_HINT,
  EMAIL_AUTH_PASSWORD_LABEL,
  EMAIL_AUTH_PASSWORD_MIN_LENGTHS,
  EMAIL_AUTH_PENDING,
  EMAIL_AUTH_SUBMIT,
  EMAIL_AUTH_SWITCH_ACTION,
  EMAIL_AUTH_SWITCH_PROMPT,
} from "@/features/auth/components/EmailAuthForm/EmailAuthForm.constants";
import { otherMode } from "@/features/auth/components/EmailAuthForm/EmailAuthForm.helpers";
import type { IEmailAuthFormProps } from "@/features/auth/components/EmailAuthForm/EmailAuthForm.interfaces";

export function EmailAuthForm({ mode, onModeChange }: IEmailAuthFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const signIn = useEmailSignInMutation();
  const signUp = useEmailSignUpMutation();
  const isSignUp = mode === EAuthMode.SIGN_UP;
  const active = { [EAuthMode.SIGN_IN]: signIn, [EAuthMode.SIGN_UP]: signUp }[mode];

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!isSignUp) {
      signIn.mutate({ email, password });
      return;
    }
    signUp.mutate({ name, email, password });
  }

  function handleModeChange(): void {
    signIn.reset();
    signUp.reset();
    onModeChange(otherMode(mode));
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-5">
        {isSignUp && (
          <Field>
            <FieldLabel htmlFor="auth-name">{EMAIL_AUTH_NAME_LABEL}</FieldLabel>
            <Input
              id="auth-name"
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor="auth-email">{EMAIL_AUTH_EMAIL_LABEL}</FieldLabel>
          <Input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="auth-password">{EMAIL_AUTH_PASSWORD_LABEL}</FieldLabel>
          <Input
            id="auth-password"
            type="password"
            autoComplete={EMAIL_AUTH_PASSWORD_AUTOCOMPLETE[mode]}
            minLength={EMAIL_AUTH_PASSWORD_MIN_LENGTHS[mode]}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {isSignUp && <FieldDescription>{EMAIL_AUTH_PASSWORD_HINT}</FieldDescription>}
        </Field>
        {active.isError && <FieldError>{apiErrorMessage(active.error)}</FieldError>}
        <Button type="submit" size="lg" className="h-10 w-full" disabled={active.isPending}>
          {active.isPending && <Spinner />}
          {active.isPending && EMAIL_AUTH_PENDING[mode]}
          {!active.isPending && EMAIL_AUTH_SUBMIT[mode]}
        </Button>
        <FieldDescription className="text-center">
          {EMAIL_AUTH_SWITCH_PROMPT[mode]}{" "}
          <Button type="button" variant="link" className="h-auto p-0" onClick={handleModeChange}>
            {EMAIL_AUTH_SWITCH_ACTION[mode]}
          </Button>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
