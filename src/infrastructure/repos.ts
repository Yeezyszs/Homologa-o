// Composição: injeta as implementações Supabase por trás das interfaces.
// A UI importa daqui e enxerga apenas os tipos de application/repositories.
import type {
  IFornecedoresRepo,
  IDocumentosRepo,
  ICatalogoRepo,
} from '@/application/repositories'
import { FornecedoresRepoSupabase } from './supabase/fornecedoresRepo'
import { DocumentosRepoSupabase } from './supabase/documentosRepo'
import { CatalogoRepoSupabase } from './supabase/catalogoRepo'

export const fornecedoresRepo: IFornecedoresRepo = new FornecedoresRepoSupabase()
export const documentosRepo: IDocumentosRepo = new DocumentosRepoSupabase()
export const catalogoRepo: ICatalogoRepo = new CatalogoRepoSupabase()
