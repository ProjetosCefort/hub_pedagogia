/**
 * Serviço para busca de endereço por CEP usando ViaCEP
 */

export interface CepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export async function buscarCep(cep: string): Promise<CepResponse | null> {
  const cleaned = cep.replace(/\D/g, "");
  
  if (cleaned.length !== 8) {
    return null;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
    const data: CepResponse = await response.json();
    
    if (data.erro) {
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
    return null;
  }
}

/**
 * Verifica se o CEP está na região metropolitana de Belo Horizonte
 */
export function isRegiaoMetropolitana(uf: string, cidade: string): boolean {
  const cidadesRM = [
    "BELO HORIZONTE",
    "CONTAGEM",
    "BETIM",
    "SABARÁ",
    "SANTA LUZIA",
    "NOVA LIMA",
    "RIBEIRÃO DAS NEVES",
    "IBIRITÉ",
    "VESPASIANO",
    "LAGOA SANTA",
    "PEDRO LEOPOLDO",
    "MATEUS LEME",
    "BRUMADINHO",
    "CAETÉ",
    "CONCEIÇÃO DO MATO DENTRO",
    "ESMERALDAS",
    "FLORESTAL",
    "IGARAPÉ",
    "JABOTICATUBAS",
    "JUATUBA",
    "MARIANA",
    "MARIANA",
    "MÁRIO CAMPOS",
    "NOVA UNIÃO",
    "OURO PRETO",
    "PAPAGAIOS",
    "PARÁ DE MINAS",
    "PRUDENTE DE MORAIS",
    "RAPOSOS",
    "RIO ACIMA",
    "SANTA BÁRBARA",
    "SÃO JOSÉ DA LAPA",
    "SÃO SEBASTIÃO DO OESTE",
    "SARZEDO",
    "TAQUARAÇU DE MINAS",
    "VARGINHA",
  ];
  
  return uf === "MG" && cidadesRM.includes(cidade.toUpperCase());
}
