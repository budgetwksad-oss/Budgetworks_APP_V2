import { useState, FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, ServiceRequest, QuoteLineItem } from '../../lib/supabase';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ArrowLeft, Plus, Trash2, CheckCircle } from 'lucide-react';

interface CreateQuoteProps {
  request: ServiceRequest;
  onBack: () => void;
}

export function CreateQuote({ request, onBack }: CreateQuoteProps) {
  const { user } = useAuth();
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([
    { description: '', quantity: 1, unit_price: 0, total: 0 }
  ]);
  const [taxRate, setTaxRate] = useState(0.13);
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: keyof QuoteLineItem, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'quantity' || field === 'unit_price') {
      updated[index].total = updated[index].quantity * updated[index].unit_price;
    }

    setLineItems(updated);
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * taxRate;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const validLineItems = lineItems.filter(item => item.description && item.quantity > 0 && item.unit_price > 0);

      if (validLineItems.length === 0) {
        setError('Please add at least one valid line item');
        setLoading(false);
        return;
      }

      if (!validUntil) {
        setError('Please set a valid until date');
        setLoading(false);
        return;
      }

      const subtotal = calculateSubtotal();
      const taxAmount = calculateTax();
      const totalAmount = calculateTotal();

      const { data: quoteNumberData, error: quoteNumberError } = await supabase
        .rpc('generate_quote_number');

      if (quoteNumberError) throw quoteNumberError;

      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          service_request_id: request.id,
          quote_number: quoteNumberData,
          line_items: validLineItems,
          subtotal: subtotal.toFixed(2),
          tax_rate: taxRate,
          tax_amount: taxAmount.toFixed(2),
          total_amount: totalAmount.toFixed(2),
          valid_until: validUntil,
          notes: notes || null,
          status: 'sent',
          created_by: user?.id,
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      const { error: requestUpdateError } = await supabase
        .from('service_requests')
        .update({ status: 'quoted' })
        .eq('id', request.id);

      if (requestUpdateError) throw requestUpdateError;

      const { error: jobError } = await supabase
        .from('jobs')
        .insert({
          quote_id: quote.id,
          service_request_id: request.id,
          customer_id: request.customer_id,
          status: 'scheduled',
        });

      if (jobError) throw jobError;

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to create quote');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <PortalLayout portalName="Admin Portal">
        <div className="min-h-[60vh] flex items-center justify-center">
          <Card className="w-full max-w-md p-8 text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-green-100 p-4 rounded-full">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Quote Sent!</h2>
            <p className="text-gray-600 mb-6">
              The quote has been created and the customer will be notified
            </p>
            <Button variant="primary" className="w-full" onClick={onBack}>
              Back to Requests
            </Button>
          </Card>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout portalName="Admin Portal">
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <Card className="p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Quote</h2>
            <p className="text-gray-600">
              {request.location_address}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addLineItem}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-4">
                {lineItems.map((item, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        required
                      />
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="1"
                        required
                      />
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        placeholder="Price"
                        value={item.unit_price}
                        onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    <div className="w-32">
                      <Input
                        value={`$${item.total.toFixed(2)}`}
                        disabled
                      />
                    </div>
                    {lineItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(index)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="max-w-md ml-auto space-y-3">
                <div className="flex justify-between items-center text-gray-700">
                  <span>Subtotal:</span>
                  <span className="font-semibold">${calculateSubtotal().toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <label className="text-gray-700">Tax Rate:</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={taxRate * 100}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) / 100 || 0)}
                      min="0"
                      max="100"
                      step="0.01"
                      className="w-24 text-right"
                    />
                    <span className="text-gray-700">%</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-gray-700">
                  <span>Tax:</span>
                  <span className="font-semibold">${calculateTax().toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-lg font-bold text-gray-900 pt-3 border-t">
                  <span>Total:</span>
                  <span className="text-orange-600">${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Valid Until"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes for the customer..."
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-colors duration-200"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={onBack}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="flex-1"
                disabled={loading}
              >
                {loading ? 'Sending Quote...' : 'Send Quote'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </PortalLayout>
  );
}
