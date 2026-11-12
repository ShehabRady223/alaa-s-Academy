import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { JoinForm } from './JoinForm';

export function JoinPage() {
  return (
    <Card className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold">Enter your exam PIN</h1>
      <p className="mt-1 text-sm text-neutral-600">Your teacher gives you an 8-character PIN for each exam. Type it below to open your exam.</p>
      <div className="mt-5"><JoinForm autoFocus /></div>
      <Link to="/me" className="mt-5 inline-block text-[13px] font-medium text-brand-700 hover:underline">Back to my work</Link>
    </Card>
  );
}
