'use client';

import { cn } from '@/lib/utils';

interface OperatorsCardProps {
  onInsertOperator: (operator: string) => void;
}

interface OperatorInfo {
  symbol: string;
  display: string;
  description: string;
  example: string;
}

export function OperatorsCard({ onInsertOperator }: OperatorsCardProps) {
  const mathOperators: OperatorInfo[] = [
    { symbol: 'ceil()', display: 'ceil()', description: 'Round up to nearest integer', example: 'ceil(4.3) = 5' },
    { symbol: 'floor()', display: 'floor()', description: 'Round down to nearest integer', example: 'floor(4.7) = 4' },
    { symbol: 'round()', display: 'round()', description: 'Round to nearest integer', example: 'round(4.5) = 5' },
    { symbol: 'sqrt()', display: 'sqrt()', description: 'Square root', example: 'sqrt(16) = 4' },
    { symbol: 'abs()', display: 'abs()', description: 'Absolute value', example: 'abs(-5) = 5' },
    { symbol: 'min()', display: 'min()', description: 'Minimum of two values', example: 'min(3, 7) = 3' },
    { symbol: 'max()', display: 'max()', description: 'Maximum of two values', example: 'max(3, 7) = 7' },
  ];

  const arithmeticOperators: OperatorInfo[] = [
    { symbol: '+', display: '+', description: 'Addition', example: '5 + 3 = 8' },
    { symbol: '-', display: '-', description: 'Subtraction', example: '5 - 3 = 2' },
    { symbol: '*', display: '*', description: 'Multiplication', example: '5 * 3 = 15' },
    { symbol: '/', display: '/', description: 'Division', example: '15 / 3 = 5' },
    { symbol: '()', display: '( )', description: 'Parentheses for grouping', example: '(2 + 3) * 4 = 20' },
  ];

  const booleanOperators: OperatorInfo[] = [
    { symbol: '==', display: '==', description: 'Equal comparison', example: '5 == 5 = true' },
    { symbol: '!=', display: '!=', description: 'Not equal comparison', example: '5 != 3 = true' },
    { symbol: '<', display: '<', description: 'Less than', example: '3 < 5 = true' },
    { symbol: '>', display: '>', description: 'Greater than', example: '5 > 3 = true' },
    { symbol: '<=', display: '<=', description: 'Less than or equal', example: '5 <= 5 = true' },
    { symbol: '>=', display: '>=', description: 'Greater than or equal', example: '5 >= 3 = true' },
    { symbol: '&&', display: '&&', description: 'Logical AND', example: 'true && false = false' },
    { symbol: '||', display: '||', description: 'Logical OR', example: 'true || false = true' },
    { symbol: '!', display: '!', description: 'Logical NOT', example: '!true = false' },
  ];

  const renderOperatorGroup = (title: string, operators: OperatorInfo[], buttonSize: 'sm' | 'md' | 'lg' = 'md') => {
    return (
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-md-primary uppercase tracking-wider">{title}</p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-1.5">
          {operators.map((op) => (
            <button
              key={op.symbol}
              type="button"
              onClick={() => onInsertOperator(op.symbol)}
              className="flex items-start gap-1.5 px-2 py-1.5 border border-md-outline rounded-lg hover:bg-md-primary/10 hover:border-md-primary/50 transition-smooth group text-left"
            >
              {/* Operator Button */}
              <div className={cn(
                "flex-shrink-0 px-1.5 py-0.5 border border-md-outline rounded font-mono font-bold text-center",
                buttonSize === 'sm' && "text-xs min-w-[40px]",
                buttonSize === 'md' && "text-[10px] min-w-[50px]",
                buttonSize === 'lg' && "text-sm min-w-[55px]",
                "group-hover:bg-md-primary/20 group-hover:border-md-primary"
              )}>
                {op.display}
              </div>
              
              {/* Inline Description */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-card-foreground leading-tight">{op.description}</div>
                <div className="text-[10px] text-md-on-surface-variant font-mono mt-0.5 leading-tight">{op.example}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-card-foreground">Operators</h4>
      
      {/* Math Functions */}
      {renderOperatorGroup('Math Functions', mathOperators, 'md')}

      {/* Arithmetic Operators */}
      {renderOperatorGroup('Arithmetic', arithmeticOperators, 'lg')}

      {/* Boolean Operators */}
      {renderOperatorGroup('Boolean & Comparison', booleanOperators, 'sm')}
    </div>
  );
}

