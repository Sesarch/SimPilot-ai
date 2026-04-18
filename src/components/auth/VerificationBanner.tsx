interface Props {
  email: string;
  resending: boolean;
  cooldown: number;
  onResend: () => void;
}

const VerificationBanner = ({ email, resending, cooldown, onResend }: Props) => (
  <div className="mb-6 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm text-foreground">
    <p className="font-display font-semibold tracking-wide text-primary mb-1">
      ✉ Check your email
    </p>
    <p className="text-muted-foreground">
      We sent a verification link to{" "}
      <span className="text-foreground font-medium">{email}</span>.
      Click the link in that email, then sign in below.
    </p>
    <button
      type="button"
      onClick={onResend}
      disabled={resending || cooldown > 0}
      className="mt-3 text-xs font-display tracking-wider uppercase text-primary hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
    >
      {resending
        ? "Sending..."
        : cooldown > 0
          ? `Resend available in ${cooldown}s`
          : "Didn't get it? Resend verification email"}
    </button>
  </div>
);

export default VerificationBanner;
