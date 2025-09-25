export default function ContactPage(){
  return (
    <div className="min-h-screen bg-white text-[var(--ink)] flex flex-col items-center justify-center p-12">
      <h1 className="text-4xl font-bold brand-blue">Contact Slate360</h1>
      <p className="mt-4 text-lg text-[var(--ink-sub)]">For inquiries, email us at <a href="mailto:support@slate360.ai" className="text-copper hover:underline">support@slate360.ai</a>.</p>
    </div>
  );
}
