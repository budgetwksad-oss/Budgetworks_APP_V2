/*
  # Invoice Lock Protection

  ## Summary
  Prevents modification of invoices once their status becomes "sent" or "paid".
  Any attempt to change financial fields (line_items, subtotal, tax_rate, tax_amount,
  total_amount) or the job reference (job_id) on a locked invoice is blocked with a
  descriptive error message.

  ## Protected Fields
  When an invoice has status = 'sent' or 'paid', the following columns become read-only:
  - line_items
  - subtotal
  - tax_rate
  - tax_amount
  - total_amount
  - job_id

  ## Allowed Updates on Locked Invoices
  These updates are still permitted so the system continues to function correctly:
  - Recording payments (amount_paid, balance_due, status, updated_at) — done via
    the record_invoice_payment SECURITY DEFINER RPC
  - Generating/revoking magic links (does not touch the invoices table)
  - Status transitions that the system sets (partial -> paid etc.)
  - notes and due_date can be updated (administrative corrections that do not
    affect financial integrity)

  ## Implementation
  A BEFORE UPDATE trigger fires on the invoices table. It inspects OLD.status and
  raises an exception if a protected column is being changed while the invoice is locked.
  The trigger intentionally does NOT block every update (e.g. status changes for
  payment recording must still go through).

  ## Notes
  - The trigger uses OLD.status (the status before the update) as the lock check,
    so an invoice becomes locked as soon as it is marked "sent".
  - Deleting a locked invoice is also blocked via a separate BEFORE DELETE trigger,
    since a paid/sent invoice should not be removed from the audit trail.
*/

-- ──────────────────────────────────────────────────────────────────────────────
-- Trigger function: enforce_invoice_lock
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION enforce_invoice_lock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only enforce when the EXISTING status is locked
  IF OLD.status IN ('sent', 'paid') THEN

    -- Block changes to financial content fields
    IF (NEW.line_items   IS DISTINCT FROM OLD.line_items)   OR
       (NEW.subtotal     IS DISTINCT FROM OLD.subtotal)     OR
       (NEW.tax_rate     IS DISTINCT FROM OLD.tax_rate)     OR
       (NEW.tax_amount   IS DISTINCT FROM OLD.tax_amount)   OR
       (NEW.total_amount IS DISTINCT FROM OLD.total_amount) OR
       (NEW.job_id       IS DISTINCT FROM OLD.job_id)
    THEN
      RAISE EXCEPTION 'This invoice is locked because it has already been sent or paid.';
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- Attach trigger to invoices table (BEFORE UPDATE)
-- ──────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_invoice_lock ON invoices;

CREATE TRIGGER trg_invoice_lock
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION enforce_invoice_lock();

-- ──────────────────────────────────────────────────────────────────────────────
-- Trigger function: prevent_locked_invoice_delete
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION prevent_locked_invoice_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IN ('sent', 'paid') THEN
    RAISE EXCEPTION 'This invoice is locked because it has already been sent or paid.';
  END IF;

  RETURN OLD;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────────────
-- Attach delete guard trigger to invoices table (BEFORE DELETE)
-- ──────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_invoice_lock_delete ON invoices;

CREATE TRIGGER trg_invoice_lock_delete
  BEFORE DELETE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION prevent_locked_invoice_delete();
