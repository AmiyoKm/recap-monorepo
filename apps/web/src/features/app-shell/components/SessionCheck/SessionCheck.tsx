import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  SESSION_CHECK_FAILED,
  SESSION_CHECK_FAILED_DETAIL,
  SESSION_CHECK_LOADING,
  SESSION_CHECK_RETRY,
} from "@/features/app-shell/components/SessionCheck/SessionCheck.constants";
import type { ISessionCheckProps } from "@/features/app-shell/components/SessionCheck/SessionCheck.interfaces";

export function SessionCheck({ isError, onRetry }: ISessionCheckProps) {
  if (!isError) {
    return (
      <div
        role="status"
        className="flex min-h-svh items-center justify-center gap-2 text-sm text-muted-foreground"
      >
        <Spinner />
        {SESSION_CHECK_LOADING}
      </div>
    );
  }
  return (
    <div className="flex min-h-svh items-center justify-center px-6">
      <Alert variant="destructive" className="max-w-md">
        <AlertTitle>{SESSION_CHECK_FAILED}</AlertTitle>
        <AlertDescription>{SESSION_CHECK_FAILED_DETAIL}</AlertDescription>
        <AlertAction>
          <Button variant="outline" size="sm" onClick={onRetry}>
            {SESSION_CHECK_RETRY}
          </Button>
        </AlertAction>
      </Alert>
    </div>
  );
}
