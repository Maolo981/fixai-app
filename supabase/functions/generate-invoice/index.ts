import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateInvoiceRequest {
  jobId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error('User not authenticated');

    const { jobId }: GenerateInvoiceRequest = await req.json();

    // Verifica job completato e pagato
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('*, quotes(*), profiles(*), technicians(*), payments(*)')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) throw new Error('Job not found');
    if (job.status !== 'completed') throw new Error('Job not completed');
    if (job.payment_status !== 'paid') throw new Error('Job not paid');

    // Verifica se fattura già esiste
    const { data: existingInvoice } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (existingInvoice) {
      return new Response(
        JSON.stringify({ invoice: existingInvoice }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ottieni dati fiscali e configurazioni
    const { data: billingInfo } = await supabaseAdmin
      .from('billing_info')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const { data: settings } = await supabaseAdmin
      .from('payment_settings')
      .select('vat_rate')
      .single();

    const vatRate = settings?.vat_rate || 22;
    const quote = job.quotes[0];
    const totalCost = parseFloat(quote.total_cost);
    const vatAmount = totalCost * (vatRate / 100);
    const totalWithVat = totalCost + vatAmount;

    // Genera numero fattura
    const { data: invoiceNumberData, error: invoiceNumberError } = await supabaseAdmin
      .rpc('generate_invoice_number');

    if (invoiceNumberError) throw invoiceNumberError;

    // Crea HTML fattura
    const invoiceHtml = generateInvoiceHTML({
      invoiceNumber: invoiceNumberData,
      invoiceDate: new Date().toLocaleDateString('it-IT'),
      job,
      quote,
      billingInfo,
      totalCost,
      vatAmount,
      vatRate,
      totalWithVat,
    });

    // Salva fattura nel database
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .insert({
        job_id: jobId,
        user_id: user.id,
        invoice_number: invoiceNumberData,
        invoice_date: new Date().toISOString().split('T')[0],
        total_amount: totalWithVat,
        vat_amount: vatAmount,
        status: 'issued',
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        invoice,
        html: invoiceHtml 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-invoice:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateInvoiceHTML(data: any): string {
  const { invoiceNumber, invoiceDate, job, quote, billingInfo, totalCost, vatAmount, vatRate, totalWithVat } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .header { text-align: center; margin-bottom: 40px; }
    .invoice-details { margin-bottom: 30px; }
    .customer-info { margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    .total { font-weight: bold; font-size: 18px; }
    .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>FATTURA</h1>
    <p>N. ${invoiceNumber}</p>
  </div>

  <div class="invoice-details">
    <p><strong>Data:</strong> ${invoiceDate}</p>
    <p><strong>Lavoro:</strong> ${job.id.substring(0, 8)}</p>
  </div>

  <div class="customer-info">
    <h3>Cliente</h3>
    ${billingInfo ? `
      <p>${billingInfo.company_name || 'Privato'}</p>
      <p>${billingInfo.address}</p>
      <p>${billingInfo.postal_code} ${billingInfo.city}</p>
      <p><strong>Codice Fiscale:</strong> ${billingInfo.tax_code}</p>
      ${billingInfo.vat_number ? `<p><strong>P.IVA:</strong> ${billingInfo.vat_number}</p>` : ''}
    ` : `<p>${job.profiles.full_name || job.profiles.email}</p>`}
  </div>

  <table>
    <thead>
      <tr>
        <th>Descrizione</th>
        <th>Quantità</th>
        <th>Prezzo</th>
        <th>Totale</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${quote.description || 'Servizio di riparazione'}</td>
        <td>1</td>
        <td>€${totalCost.toFixed(2)}</td>
        <td>€${totalCost.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top: 30px; text-align: right;">
    <p>Imponibile: €${totalCost.toFixed(2)}</p>
    <p>IVA (${vatRate}%): €${vatAmount.toFixed(2)}</p>
    <p class="total">TOTALE: €${totalWithVat.toFixed(2)}</p>
  </div>

  <div class="footer">
    <p>Pagamento effettuato tramite carta di credito</p>
  </div>
</body>
</html>
  `;
}
