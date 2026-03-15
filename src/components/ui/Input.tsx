import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';

interface BaseProps {
  label?: string;
  error?: string;
}

interface InputOnlyProps extends BaseProps, InputHTMLAttributes<HTMLInputElement> {
  type?: Exclude<string, 'textarea'>;
  rows?: never;
}

interface TextareaProps extends BaseProps, TextareaHTMLAttributes<HTMLTextAreaElement> {
  type: 'textarea';
  rows?: number;
}

type InputProps = InputOnlyProps | TextareaProps;

const sharedClass = (error: string | undefined, className: string) =>
  `w-full px-4 py-2.5 border rounded-lg transition-colors duration-200 ${
    error
      ? 'border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-200'
      : 'border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200'
  } outline-none disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`;

export const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  ({ className = '', label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
          </label>
        )}
        {props.type === 'textarea' ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            className={sharedClass(error, className)}
            {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            className={sharedClass(error, className)}
            {...(props as InputHTMLAttributes<HTMLInputElement>)}
          />
        )}
        {error && (
          <p className="mt-1.5 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
