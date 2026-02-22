import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import nodemailer from "npm:nodemailer"

// Use Deno.serve (the modern standard) instead of the old 'serve' import
Deno.serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: mails, error: dbError } = await supabaseClient
      .from('email_queue')
      .select('*')
      .eq('sent', false)

    if (dbError) throw dbError

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: Deno.env.get('GMAIL_USER'),
        pass: Deno.env.get('GMAIL_APP_PASSWORD')
      }
    })

    let sentCount = 0
    for (const mail of mails || []) {
      await transporter.sendMail({
        from: `ResearchHub <${Deno.env.get('GMAIL_USER')}>`,
        to: mail.to_email,
        subject: mail.subject,
        text: mail.body
      })

      await supabaseClient
        .from('email_queue')
        .update({ sent: true })
        .eq('id', mail.id)
      
      sentCount++
    }

    return new Response(JSON.stringify({ sent: sentCount }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
})