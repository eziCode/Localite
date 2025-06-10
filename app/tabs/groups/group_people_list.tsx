import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const GroupPeopleList = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.welcomeText}>Welcome</Text>
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
    welcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
    },
});

export default GroupPeopleList;