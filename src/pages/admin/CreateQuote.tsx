import { useState, FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/activityLogger';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { MenuSection } from '../../components/layout/Sidebar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ArrowLeft, Copy, CheckCircle, MapPin, Calendar, Mail, Phone, User } from 'lucide-react';

type UnifiedRequest = {
  id: string;
  type: 'service_request' | 'public_quote_request';
  service_type: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  location_address: string;
  preferred_date: string | null;
  description: string | null;
  status: string;
  created_at: string;
  customer_id?: string;
  preferred_contact_method?: string;
};

interface CreateQuoteProps {
  lead: UnifiedRequest;
  onBack: () => void;
  onSuccess: () => void;
  sidebarSections?: MenuSection[];
}

export function CreateQuote({ lead, onBack, onSuccess, sidebarSections }: CreateQuoteProps) {
  const { user } = useAuth();
  const [estimateLow, setEstimateLow] = useState<string>('');
  const [estimateHigh, setEstimateHigh] = useState<string>('');
  const [capAmount, setCapAmount] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const getServiceLabel = (type: string) => {
    switch (type) {
      case 'moving': return 'Moving';
      case 'junk_removal': return 'Junk Removal';
      case 'demolition': return 'Light Demo';
      default: return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSaveDraft = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!estimateLow && !estimateHigh) {
        setError('Please provide at least an estimate range');
        setLoading(false);
        return;
      }

      const lowValue = estimateLow ? parseFloat(estimateLow) : null;
      const highValue = estimateHigh ? parseFloat(estimateHigh) : null;
      const capValue = capAmount ? parseFloat(capAmount) : null;

      const { data: quoteNumberData, error: quoteNumberError } = await supabase
        .rpc('generate_quote_number');

      if (quoteNumberError) throw quoteNumberError;

      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 14);

      const quoteData: any = {
        quote_number: quoteNumberData,
        line_items: [],
        subtotal: 0,
        tax_rate: 0,
        tax_amount: 0,
        total_amount: 0,
        estimate_low: lowValue,
        estimate_high: highValue,
        expected_price: highValue || lowValue,
        cap_amount: capValue,
        valid_until: validUntil.toISOString().split('T')[0],
        notes: notes || null,
        status: 'draft',
        created_by: user?.id,
        pricing_snapshot: {
          service_type: lead.service_type,
          location: lead.location_address,
          preferred_date: lead.preferred_date,
          description: lead.description,
        },
      };

      if (lead.type === 'public_quote_request') {
        quoteData.public_quote_request_id = lead.id;
      } else {
        quoteData.service_request_id = lead.id;
      }

      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert(quoteData)
        .select()
        .single();

      if (quoteError) throw quoteError;

      setQuoteId(quote.id);

      await logActivity({
        action: 'created',
        resourceType: lead.type === 'public_quote_request' ? 'public_quote_request' : 'service_request',
        resourceId: lead.id,
        description: `Quote ${quoteData.quote_number} saved as draft`,
        metadata: {
          quote_id: quote.id,
          estimate_low: lowValue,
          estimate_high: highValue,
        }
      });

      alert('Quote saved as draft');
    } catch (err: any) {
      setError(err.message || 'Failed to save quote');
    } finally {
      setLoading(false);
    }
  };

  const handleSendQuote = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!estimateLow && !estimateHigh) {
        setError('Please provide at least an estimate range');
        setLoading(false);
        return;
      }

      const lowValue = estimateLow ? parseFloat(estimateLow) : null;
      const highValue = estimateHigh ? parseFloat(estimateHigh) : null;
      const capValue = capAmount ? parseFloat(capAmount) : null;

      let currentQuoteId = quoteId;

      if (!currentQuoteId) {
        const { data: quoteNumberData, error: quoteNumberError } = await supabase
          .rpc('generate_quote_number');

        if (quoteNumberError) throw quoteNumberError;

        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 14);

        const quoteData: any = {
          quote_number: quoteNumberData,
          line_items: [],
          subtotal: 0,
          tax_rate: 0,
          tax_amount: 0,
          total_amount: 0,
          estimate_low: lowValue,
          estimate_high: highValue,
          expected_price: highValue || lowValue,
          cap_amount: capValue,
          valid_until: validUntil.toISOString().split('T')[0],
          notes: notes || null,
          status: 'sent',
          created_by: user?.id,
          pricing_snapshot: {
            service_type: lead.service_type,
            location: lead.location_address,
            preferred_date: lead.preferred_date,
            description: lead.description,
          },
        };

        if (lead.type === 'public_quote_request') {
          quoteData.public_quote_request_id = lead.id;
        } else {
          quoteData.service_request_id = lead.id;
        }

        const { data: quote, error: quoteError } = await supabase
          .from('quotes')
          .insert(quoteData)
          .select()
          .single();

        if (quoteError) throw quoteError;
        currentQuoteId = quote.id;
        setQuoteId(currentQuoteId);
      } else {
        const { error: updateError } = await supabase
          .from('quotes')
          .update({
            estimate_low: lowValue,
            estimate_high: highValue,
            expected_price: highValue || lowValue,
            cap_amount: capValue,
            notes: notes || null,
            status: 'sent',
          })
          .eq('id', currentQuoteId);

        if (updateError) throw updateError;
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14);

      const { data: linkData, error: linkError } = await supabase
        .rpc('create_quote_magic_link', {
          p_quote_id: currentQuoteId,
          p_expires_at: expiresAt.toISOString(),
        });

      if (linkError) throw linkError;

      const fullLink = `${window.location.origin}/q/${linkData.token}`;
      setMagicLink(fullLink);

      const tableName = lead.type === 'public_quote_request' ? 'public_quote_requests' : 'service_requests';
      const { error: leadUpdateError } = await supabase
        .from(tableName)
        .update({ status: 'quoted' })
        .eq('id', lead.id);

      if (leadUpdateError) throw leadUpdateError;

      await logActivity({
        action: 'sent',
        resourceType: lead.type === 'public_quote_request' ? 'public_quote_request' : 'service_request',
        resourceId: lead.id,
        description: `Quote sent via magic link to ${lead.contact_name}`,
        metadata: {
          quote_id: currentQuoteId,
          magic_link: fullLink,
          estimate_low: lowValue,
          estimate_high: highValue,
          recipient_email: lead.contact_email,
          recipient_phone: lead.contact_phone,
        }
      });

    } catch (err: any) {
      setError(err.message || 'Failed to send quote');
    } finally {
      setLoading(false);
    }
  };

  if (magicLink) {
    const smsTemplate = `BudgetWorks quote: ${magicLink} Reply here if you have questions.`;
    const emailSubject = `Your Quote from BudgetWorks`;
    const emailBody = `Hi ${lead.contact_name},\n\nThank you for requesting a quote from BudgetWorks. Please review your quote at the link below:\n\n${magicLink}\n\nThis quote is valid for 14 days. If you have any questions, please don't hesitate to reach out.\n\nBest regards,\nBudgetWorks Team`;

    return (
      <PortalLayout
        portalName="Admin Portal"
        sidebarSections={sidebarSections}
        activeItemId="service-requests"
        breadcrumbs={[
          { label: 'Leads', onClick: onSuccess },
          { label: 'Create Quote' }
        ]}
      >
        <div className="min-h-[60vh] flex items-center justify-center">
          <Card className="w-full max-w-2xl p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-green-100 p-4 rounded-full">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Quote Link Created!</h2>
            <p className="text-gray-600 mb-6 text-center">
              Share this link with {lead.contact_name}{lead.preferred_contact_method ? ` via their preferred method: ${lead.preferred_contact_method}` : ''}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quote Link</label>
                <div className="flex gap-2">
                  <Input
                    value={magicLink}
                    readOnly
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => handleCopy(magicLink, 'link')}
                    className="flex items-center gap-2"
                  >
                    {copied === 'link' ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMS Template</label>
                <div className="flex gap-2">
                  <textarea
                    value={smsTemplate}
                    readOnly
                    rows={2}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => handleCopy(smsTemplate, 'sms')}
                    className="flex items-center gap-2"
                  >
                    {copied === 'sms' ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy SMS
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Template</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={emailSubject}
                      readOnly
                      className="flex-1 text-sm bg-gray-50"
                      placeholder="Subject"
                    />
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      value={emailBody}
                      readOnly
                      rows={6}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                    />
                    <Button
                      variant="secondary"
                      onClick={() => handleCopy(`Subject: ${emailSubject}\n\n${emailBody}`, 'email')}
                      className="flex items-center gap-2"
                    >
                      {copied === 'email' ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Email
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-6 border-t">
              <Button variant="secondary" className="flex-1" onClick={onBack}>
                Back to Lead
              </Button>
              <Button variant="primary" className="flex-1" onClick={onSuccess}>
                Done
              </Button>
            </div>
          </Card>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout
      portalName="Admin Portal"
      sidebarSections={sidebarSections}
      activeItemId="service-requests"
      breadcrumbs={[
        { label: 'Leads', onClick: onBack },
        { label: 'Create Quote' }
      ]}
    >
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Lead
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Summary</h3>

              <div className="space-y-4">
                <div>
                  <span className="px-3 py-1.5 text-sm font-semibold bg-orange-100 text-orange-700 rounded-full">
                    {getServiceLabel(lead.service_type)}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-1">Contact</h4>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-gray-900">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{lead.contact_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-xs">{lead.contact_email}</span>
                    </div>
                    {lead.contact_phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{lead.contact_phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {lead.preferred_contact_method && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-1">Preferred Contact</h4>
                    <p className="text-sm text-gray-900 capitalize">{lead.preferred_contact_method}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-1">Location</h4>
                  <div className="flex items-start gap-2 text-sm text-gray-900">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <span>{lead.location_address}</span>
                  </div>
                </div>

                {lead.preferred_date && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-1">Preferred Date</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-900">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{formatDate(lead.preferred_date)}</span>
                    </div>
                  </div>
                )}

                {lead.description && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-500 mb-1">Description</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.description}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Quote</h2>
                <p className="text-gray-600">
                  Provide an estimate range for this {getServiceLabel(lead.service_type).toLowerCase()} job
                </p>
              </div>

              <form onSubmit={handleSendQuote} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Estimate Low ($)"
                    type="number"
                    value={estimateLow}
                    onChange={(e) => setEstimateLow(e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="Minimum estimate"
                  />
                  <Input
                    label="Estimate High ($)"
                    type="number"
                    value={estimateHigh}
                    onChange={(e) => setEstimateHigh(e.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="Maximum estimate"
                  />
                </div>

                <Input
                  label="Cap Amount (Not-to-Exceed) - Optional"
                  type="number"
                  value={capAmount}
                  onChange={(e) => setCapAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="Maximum amount (optional)"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Internal Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Internal notes about pricing, considerations, etc..."
                    rows={4}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-colors duration-200"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-6 border-t">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onBack}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSaveDraft}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Draft'}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Send Quote Link'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
