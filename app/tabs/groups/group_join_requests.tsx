import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const GroupJoinRequests = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Welcome to page</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    text: {
        fontSize: 20,
        fontWeight: 'bold',
    },
});

export default GroupJoinRequests;