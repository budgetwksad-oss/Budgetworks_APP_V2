import { useState } from 'react';
import { CheckCircle, HardHat, DollarSign, UserX, ShieldCheck } from 'lucide-react';

interface ContractorAgreementModalProps {
  crewName?: string;
  onAccept: () => void;
  submitting: boolean;
}

export function ContractorAgreementModal({ crewName, onAccept, submitting }: ContractorAgreementModalProps) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-orange-100 p-2 rounded-lg">
              <HardHat className="w-5 h-5 text-orange-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Contractor Agreement</h2>
          </div>
          <p className="text-sm text-gray-500 ml-11">
            {crewName ? `Welcome, ${crewName}.` : 'Welcome.'} Please review and accept before continuing.
          </p>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <AgreementClause
            icon={<UserX className="w-4 h-4 text-blue-600" />}
            iconBg="bg-blue-50"
            title="Independent Contractor Status"
          >
            You are engaged by BudgetWorks as an <strong>independent contractor</strong>, not as an employee.
            This agreement does not create an employment relationship. You retain the right to perform services
            for other clients, provided doing so does not conflict with your BudgetWorks commitments.
          </AgreementClause>

          <AgreementClause
            icon={<DollarSign className="w-4 h-4 text-green-600" />}
            iconBg="bg-green-50"
            title="Tax Responsibility"
          >
            As an independent contractor, you are solely responsible for reporting and remitting all
            applicable income taxes, GST/HST, and any other government deductions. BudgetWorks will
            not withhold taxes on your behalf. You are responsible for maintaining your own records
            and complying with CRA requirements.
          </AgreementClause>

          <AgreementClause
            icon={<UserX className="w-4 h-4 text-red-500" />}
            iconBg="bg-red-50"
            title="No Employee Benefits"
          >
            You are not entitled to employment insurance, vacation pay, statutory holiday pay,
            employer pension contributions, health benefits, or any other benefits that apply to
            employees. You acknowledge that you are not covered by BudgetWorks' employee benefit plans.
          </AgreementClause>

          <AgreementClause
            icon={<ShieldCheck className="w-4 h-4 text-orange-600" />}
            iconBg="bg-orange-50"
            title="Company Rules & Safety"
          >
            While on BudgetWorks jobs you agree to:
            <ul className="mt-2 space-y-1 list-none">
              {[
                'Follow all safety guidelines and use required protective equipment',
                'Conduct yourself professionally with customers and team members',
                'Arrive on time and notify dispatch of any delays promptly',
                'Handle customer property with care and report any damage immediately',
                'Comply with all applicable occupational health and safety regulations',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </AgreementClause>

          <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500 leading-relaxed">
            This agreement is governed by the laws of the Province of Nova Scotia and the federal laws
            of Canada. BudgetWorks Moving — {new Date().getFullYear()}.
          </div>
        </div>

        <div className="px-6 pb-6 pt-4 border-t border-gray-100 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${checked ? 'bg-orange-500 border-orange-500' : 'border-gray-300 group-hover:border-orange-400'}`}>
                {checked && <CheckCircle className="w-3.5 h-3.5 text-white" />}
              </div>
            </div>
            <span className="text-sm text-gray-700 leading-snug">
              I have read and agree to the BudgetWorks Contractor Agreement. I understand I am an
              independent contractor and am responsible for my own taxes and compliance.
            </span>
          </label>

          <button
            onClick={onAccept}
            disabled={!checked || submitting}
            className="w-full py-3 rounded-lg font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            {submitting ? 'Saving...' : 'Accept & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface AgreementClauseProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  children: React.ReactNode;
}

function AgreementClause({ icon, iconBg, title, children }: AgreementClauseProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`${iconBg} p-1.5 rounded-lg`}>{icon}</div>
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{children}</p>
    </div>
  );
}
