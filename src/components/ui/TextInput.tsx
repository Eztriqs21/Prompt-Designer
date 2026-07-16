import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

interface CommonProps {
  label?: ReactNode;
  className?: string;
}

type InputProps = CommonProps & InputHTMLAttributes<HTMLInputElement> & { as?: 'input' };
type TextareaProps = CommonProps & TextareaHTMLAttributes<HTMLTextAreaElement> & { as: 'textarea' };

type Props = InputProps | TextareaProps;

const fieldCls =
  'w-full bg-secondary-darkSurface text-primary-light placeholder:text-secondary-midGray border border-secondary-borderGray rounded-md px-3 py-2 text-body outline-none transition-colors duration-150 focus:border-accent-blue';

export default function TextInput(props: Props) {
  const { label, className = '', ...rest } = props;
  const isTextarea = 'as' in rest && (rest as { as?: string }).as === 'textarea';
  return (
    <label className="block">
      {label && <span className="block text-small text-secondary-midGray mb-1.5">{label}</span>}
      {isTextarea ? (
        <textarea
          className={`${fieldCls} ${className}`}
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input className={`${fieldCls} ${className}`} {...(rest as InputHTMLAttributes<HTMLInputElement>)} />
      )}
    </label>
  );
}
