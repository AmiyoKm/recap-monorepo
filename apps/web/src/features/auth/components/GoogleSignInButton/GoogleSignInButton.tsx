import { useGoogleSignInMutation } from "@/api/auth/auth.mutations";
import { apiErrorMessage } from "@/api/client/client.helpers";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { GoogleMark } from "@/features/auth/components/GoogleSignInButton/components/GoogleMark";
import {
  GOOGLE_SIGN_IN_LABEL,
  GOOGLE_SIGN_IN_PENDING,
} from "@/features/auth/components/GoogleSignInButton/GoogleSignInButton.constants";

export function GoogleSignInButton() {
  const signIn = useGoogleSignInMutation();

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-10 w-full"
        disabled={signIn.isPending}
        onClick={() => signIn.mutate()}
      >
        {signIn.isPending && <Spinner />}
        {!signIn.isPending && <GoogleMark />}
        {signIn.isPending && GOOGLE_SIGN_IN_PENDING}
        {!signIn.isPending && GOOGLE_SIGN_IN_LABEL}
      </Button>
      {signIn.isError && <FieldError>{apiErrorMessage(signIn.error)}</FieldError>}
    </div>
  );
}
