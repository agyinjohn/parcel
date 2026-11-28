interface Props {
  variant?: "search" | "default";
}

export const ReceiveFooter = ({ variant: _variant = "default" }: Props) => (
  <footer className="mt-6 text-center pb-4">
    <p className="text-xs text-slate-500">Tap a parcel to see where it is, what to pay and how to get it.</p>
  </footer>
);
