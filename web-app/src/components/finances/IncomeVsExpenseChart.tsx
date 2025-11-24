'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

interface IncomeVsExpenseChartProps {
  data: MonthlyData[];
}

export default function IncomeVsExpenseChart({ data }: IncomeVsExpenseChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
        <YAxis />
        <Tooltip 
          formatter={(value: number) => `$${value.toFixed(2)}`}
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #ddd',
            borderRadius: '8px'
          }}
        />
        <Legend />
        <Bar dataKey="income" fill="#10B981" name="Ingresos" />
        <Bar dataKey="expenses" fill="#EF4444" name="Egresos" />
      </BarChart>
    </ResponsiveContainer>
  );
}
