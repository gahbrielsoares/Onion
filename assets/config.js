/* Configuração do cadastro (Supabase). Enquanto os dois campos estiverem vazios,
 * o Onion Park abre direto, sem pedir cadastro.
 * A "anon key" é pública por natureza: quem protege os dados são as regras (RLS) do banco. */
window.ONION_CFG = {
  supabaseUrl: "https://jvjuwgobzjhnssnkrnzu.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2anV3Z29iempobnNzbmtybnp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1OTkxNTYsImV4cCI6MjExMDE3NTE1Nn0.gLPOFCeUTR-LlCIZRjWx3bVd3xouoYKK1BbheCOO5GY",
  appPath: "app/"        // onde fica o parque, a partir da raiz do site
};
