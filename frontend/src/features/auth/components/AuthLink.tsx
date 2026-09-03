import { Link, useLocation, type LinkProps } from "react-router-dom";

type AuthLinkProps = Omit<LinkProps, "state"> & {
  state?: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function AuthLink({ state, ...linkProps }: AuthLinkProps) {
  const location = useLocation();
  const currentState = isRecord(location.state) ? location.state : {};
  const backgroundLocation =
    currentState.backgroundLocation ?? location;

  return (
    <Link
      {...linkProps}
      state={{ ...currentState, ...state, backgroundLocation }}
    />
  );
}
