import { Button, LinkButton } from "./Button";

/** An error from loading a screen's data, with a way to try again and a way out. */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <>
      <p className="status status--error" role="alert">
        {message}
      </p>
      <div className="actions">
        <Button onClick={onRetry}>Try again</Button>
        <LinkButton quiet href="#/trips">
          Back to your trips
        </LinkButton>
      </div>
    </>
  );
}
