import { Navigate } from "@tanstack/react-router";
import { useState } from "react";

import { useSessionQuery } from "@/api/auth/auth.queries";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { FieldSeparator } from "@/components/ui/field";
import { EHeadingTag, EHeadingVariant, Heading } from "@/features/app-shell/components/Heading";
import { Wordmark } from "@/features/app-shell/components/Wordmark";
import { toAuthMode } from "@/features/auth/auth.helpers";
import { EmailAuthForm } from "@/features/auth/components/EmailAuthForm";
import { GoogleSignInButton } from "@/features/auth/components/GoogleSignInButton";
import {
  SIGN_IN_DESCRIPTION,
  SIGN_IN_GOOGLE_FAILED,
  SIGN_IN_SEPARATOR,
  SIGN_IN_TITLE,
} from "@/features/auth/containers/SignInContainer/SignInContainer.constants";
import type { ISignInContainerProps } from "@/features/auth/containers/SignInContainer/SignInContainer.interfaces";

export function SignInContainer({ error, mode: initialMode }: ISignInContainerProps) {
  const session = useSessionQuery();
  const [mode, setMode] = useState(toAuthMode(initialMode));

  if (session.data) {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <div className="flex min-h-svh flex-col items-center px-6 py-10 sm:px-10">
      <main className="flex w-full max-w-sm flex-1 flex-col justify-center gap-8 py-10">
        <div className="flex flex-col gap-6">
          <Wordmark to="/" />
          <div className="flex flex-col gap-1.5">
            <Heading as={EHeadingTag.H1} variant={EHeadingVariant.TITLE}>
              {SIGN_IN_TITLE[mode]}
            </Heading>
            <p className="text-sm text-muted-foreground">{SIGN_IN_DESCRIPTION[mode]}</p>
          </div>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>{SIGN_IN_GOOGLE_FAILED}</AlertTitle>
          </Alert>
        )}
        <GoogleSignInButton />
        <FieldSeparator>{SIGN_IN_SEPARATOR}</FieldSeparator>
        <EmailAuthForm mode={mode} onModeChange={setMode} />
      </main>
    </div>
  );
}
