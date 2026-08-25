const SITE_DA_MARCA = "https://teacherana.com.br";

/**
 * Tela de "não tem nada pra ver aqui" do funil.
 *
 * Aparece em dois pontos, e nos dois o visitante chegou com intenção de
 * comprar: a raiz do site sem nenhum produto marcado como destino padrão, e
 * qualquer /{slug} morto quando também não há destino pra onde desviar.
 *
 * Quando existe um produto em campanha, ninguém vê esta tela — as duas rotas
 * redirecionam antes. Ela é o fundo do poço, não o caminho normal.
 */
export function ProdutoIndisponivel({ href = SITE_DA_MARCA }: { href?: string }) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 sm:p-10 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
          Esse produto não está disponível no momento
        </h1>

        <p className="text-gray-600 mb-8 font-medium">
          As inscrições para esse produto não estão disponíveis.
          Enquanto isso, dá uma olhada no nosso workshop atual.
        </p>

        <a
          href={href}
          className="inline-block w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-lg hover:opacity-90 transition-opacity"
        >
          Ir para o Workshop
        </a>
      </div>
    </main>
  );
}
