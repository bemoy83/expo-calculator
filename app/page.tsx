'use client';

import { Layout } from '@/components/Layout';
import { QuoteBoard } from '@/components/dashboard/QuoteBoard';

export default function Home() {
  return (
    <Layout>
      <QuoteBoard />
    </Layout>
  );
}
