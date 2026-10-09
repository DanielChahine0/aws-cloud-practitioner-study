import { useTitle } from '../../ui/useTitle.ts';

export function NotFound({ hash }: { hash: string }) {
  useTitle('Not found');
  return (
    <>
      <h1>Page not found</h1>
      <p>
        Nothing lives at <code>{hash}</code>.
      </p>
      <p>
        <a href="#/">Go to Home</a>
      </p>
    </>
  );
}
