import { useState } from 'react';
import { CheckCircle, X, FileText, AlertTriangle, CreditCard, Ban } from 'lucide-react';

interface ServiceAgreementModalProps {
  onAccept: () => void;
  onCancel: () => void;
  submitting: boolean;
}

export function ServiceAgreementModal({ onAccept, onCancel, submitting }: ServiceAgreementModalProps) {
  const [termsChecked, setTermsChecked] = useState(false);
  const [cancellationChecked, setCancellationChecked] = useState(false);
  const [liabilityChecked, setLiabilityChecked] = useState(false);
  const [paymentChecked, setPaymentChecked] = useState(false);

  const allChecked = termsChecked && cancellationChecked && liabilityChecked && paymentChecked;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Service Agreement</h2>
              <p className="text-sm text-gray-500">Please review and acknowledge all terms before confirming</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <AgreementSection
            icon={<FileText className="w-5 h-5 text-blue-600" />}
            iconBg="bg-blue-50"
            title="Terms &amp; Conditions"
            checked={termsChecked}
            onChange={setTermsChecked}
            checkLabel="I have read and agree to the BudgetWorks Terms of Service"
          >
            <p className="text-sm text-gray-600 leading-relaxed">
              By accepting this quote, you agree to the{' '}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 hover:underline font-medium"
              >
                BudgetWorks Terms of Service
              </a>
              . Services are provided on a professional basis. BudgetWorks reserves the right to decline or
              reschedule jobs due to safety, access, or scope concerns. Quote acceptance constitutes a binding
              commitment to proceed with the agreed service.
            </p>
          </AgreementSection>

          <AgreementSection
            icon={<Ban className="w-5 h-5 text-yellow-600" />}
            iconBg="bg-yellow-50"
            title="Cancellation Policy"
            checked={cancellationChecked}
            onChange={setCancellationChecked}
            checkLabel="I understand and agree to the cancellation policy"
          >
            <ul className="text-sm text-gray-600 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                Cancellations more than 48 hours before scheduled service: <strong className="text-gray-800 ml-1">No fee</strong>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0" />
                Cancellations 24–48 hours before: <strong className="text-gray-800 ml-1">25% of quoted amount</strong>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                Cancellations less than 24 hours before: <strong className="text-gray-800 ml-1">50% of quoted amount</strong>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                Rescheduling requests are subject to crew availability
              </li>
            </ul>
          </AgreementSection>

          <AgreementSection
            icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
            iconBg="bg-orange-50"
            title="Liability Statement"
            checked={liabilityChecked}
            onChange={setLiabilityChecked}
            checkLabel="I understand the liability limitations"
          >
            <p className="text-sm text-gray-600 leading-relaxed">
              BudgetWorks carries general liability insurance. We are not responsible for damage to items
              improperly packed by the customer, pre-existing damage, or items of exceptional value unless
              declared in advance. Customers are responsible for securing valuable or fragile items,
              obtaining any required access permits, and ensuring safe site conditions for our crew.
              To the fullest extent permitted by law, BudgetWorks' liability is limited to the value of
              the contracted service.
            </p>
          </AgreementSection>

          <AgreementSection
            icon={<CreditCard className="w-5 h-5 text-green-600" />}
            iconBg="bg-green-50"
            title="Payment Terms"
            checked={paymentChecked}
            onChange={setPaymentChecked}
            checkLabel="I agree to the payment terms"
          >
            <ul className="text-sm text-gray-600 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                All pricing is in <strong className="text-gray-800">Canadian dollars (CAD)</strong>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                Payment is due upon receipt of invoice unless otherwise agreed in writing
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                Accepted methods: cash, e-transfer, credit/debit card, cheque
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                Final price may vary if the scope of work changes on-site
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                Late payments may incur an administrative fee
              </li>
            </ul>
          </AgreementSection>
        </div>

        <div className="px-6 pb-6 pt-4 border-t border-gray-100">
          {!allChecked && (
            <p className="text-xs text-gray-500 text-center mb-3">
              Please acknowledge all four sections above to continue
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={submitting}
              className="flex-1 py-3 rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Go Back
            </button>
            <button
              onClick={onAccept}
              disabled={!allChecked || submitting}
              className="flex-1 py-3 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              {submitting ? 'Confirming...' : 'Confirm &amp; Accept'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AgreementSectionProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  checkLabel: string;
  children: React.ReactNode;
}

function AgreementSection({ icon, iconBg, title, checked, onChange, checkLabel, children }: AgreementSectionProps) {
  return (
    <div className={`rounded-xl border-2 transition-colors ${checked ? 'border-green-200 bg-green-50/30' : 'border-gray-100 bg-gray-50/50'}`}>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`${iconBg} p-1.5 rounded-lg`}>
            {icon}
          </div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {checked && <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />}
        </div>
        {children}
        <label className="flex items-start gap-3 mt-4 cursor-pointer group">
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${checked ? 'bg-green-500 border-green-500' : 'border-gray-300 group-hover:border-green-400'}`}>
              {checked && <CheckCircle className="w-3.5 h-3.5 text-white" />}
            </div>
          </div>
          <span className="text-sm text-gray-700 leading-snug">{checkLabel}</span>
        </label>
      </div>
    </div>
  );
}
