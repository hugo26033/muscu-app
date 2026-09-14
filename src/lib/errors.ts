/** Erreur destinée à être affichée telle quelle à l'utilisateur. */
export class ValidationError extends Error {}

export function errorMessage(error: unknown) {
  if (error instanceof ValidationError) return error.message;
  return `Erreur inattendue : ${error instanceof Error ? error.message : String(error)}`;
}
