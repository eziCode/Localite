import { supabase } from '../supabase';

export async function uploadUserInteraction(
  userDoingAction: string,
  userOnRecievingEndOfAction: string,
  interactionType: string
) {
  const { error } = await supabase
    .from('user_interactions')
    .insert({
      user_id: userDoingAction,
      action: interactionType,
      target_type: "user",
      target_id: userOnRecievingEndOfAction,
    });

  if (error) {
    console.error('Error logging user interaction:', error);
  }
}