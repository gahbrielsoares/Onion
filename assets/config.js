/* Configuração do cadastro (Supabase). Enquanto os dois campos estiverem vazios,
 * o Onion Park abre direto, sem pedir cadastro.
 * A "anon key" é pública por natureza: quem protege os dados são as regras (RLS) do banco. */
window.ONION_CFG = {
  supabaseUrl: "https://jvjuwgobzjhnssnkrnzu.supabase.co",
  supabaseAnonKey: "",   // Project Settings › API › anon public
  appPath: "app/"        // onde fica o parque, a partir da raiz do site
};
