import { Link } from 'react-router-dom';

type PrimaryButtonProps = {
  to: string;
  children: string;
};

export function PrimaryButton({ to, children }: PrimaryButtonProps) {
  return (
    <Link to={to} className="btn btn-primary">
      {children}
    </Link>
  );
}
