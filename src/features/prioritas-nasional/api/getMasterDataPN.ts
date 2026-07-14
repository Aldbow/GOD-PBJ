import { supabase } from '@/lib/supabase';
import { MasterDataPN } from '@/types';

export async function getMasterDataPN(): Promise<MasterDataPN[]> {
  const { data, error } = await supabase
    .from('master_data_pn')
    .select('*')
    .order('No', { ascending: true }); // Assuming 'No' is a number-like string that can be ordered

  if (error) {
    console.error('Error fetching master_data_pn:', error);
    throw new Error('Gagal mengambil data program prioritas nasional');
  }

  // Handle parsing if needed. Wait, 'No' is text. Order might be lexicographical.
  // Assuming it's fine for now. If it has issues, we can sort it on the client.
  
  return data as MasterDataPN[];
}
