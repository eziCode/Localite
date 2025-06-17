import { supabase } from '../supabase';

export async function uploadUserInteraction(
  userDoingAction: string,
  itemOnRecievingEndOfAction: number,
  interactionType: string,
  targetType: string
) {
  const { error } = await supabase
    .from('user_interactions')
    .insert({
      user_id: userDoingAction,
      action: interactionType,
      target_type: targetType,
      target_id: itemOnRecievingEndOfAction,
    });

  if (error) {
    console.error('Error logging user interaction:', error);
  }
}