export default function LoginPage(){
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-12">
      <h1 className="text-4xl font-bold brand-blue">Login</h1>
      <form className="mt-6 w-full max-w-sm flex flex-col gap-4">
        <input type="email" placeholder="Email" className="border rounded px-3 py-2"/>
        <input type="password" placeholder="Password" className="border rounded px-3 py-2"/>
        <button className="bg-copper text-white py-2 rounded hover:opacity-90">Login</button>
      </form>
    </div>
  );
}