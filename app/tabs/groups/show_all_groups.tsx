import { supabase } from '@/lib/supabase';
import { Group } from '@/types/group';
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';

const ShowAllGroups = () => {
    const params = useLocalSearchParams();

    const [groupsToDisplay, setGroupsToDisplay] = useState<Group[]>(
        params.groupsAlreadyFetched ? JSON.parse(params.groupsAlreadyFetched as string) : []
    );
    const user: import("@supabase/supabase-js").User = params.user ? JSON.parse(params.user as string) : null;
    const type: string = Array.isArray(params.type) ? params.type[0] : params.type;

    const fetchRemainingGroups = async () => {
        if (type === 'user') {
            const { data, error } = await supabase
                .from("groups")
                .select("*")
                .filter("members", "cs", JSON.stringify([user.id]));
            
            if (error) {
                console.error("Error fetching user groups:", error);
                return;
            }
            setGroupsToDisplay(data || []);
        } else if (type === 'suggested') {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
            const { data: requests, error: requestError } = await supabase
                .from("group_join_requests")
                .select("group_id, status, created_at")
                .eq("from_id", user.id);
        
            if (requestError) {
                console.error("Error fetching join requests:", requestError);
                return;
            }
        
            const blockedGroupIds = new Set(
                requests?.filter(req =>
                req.status === "pending" ||
                (req.created_at && new Date(req.created_at) > oneWeekAgo)
                ).map(req => req.group_id)
            );
        
            const { data: groups, error: groupError } = await supabase
                .from("groups")
                .select("*")
                .not("members", "cs", JSON.stringify([user.id]))
                .neq("visibility", "hidden");
            
            if (groupError) {
                console.error("Error fetching suggested groups:", groupError);
                return;
            }
            const filteredGroups = groups?.filter(group => !blockedGroupIds.has(group.id)) || [];
            setGroupsToDisplay(filteredGroups);
        }
    };

    // each group should be clickable and navigate to the group view

    return (
        <View>
            <Text>Welcome to Group View</Text>
        </View>
    );
};


export default ShowAllGroups;