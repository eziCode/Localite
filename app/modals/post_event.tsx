import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type PostEventModalProps = {
    onClose: () => void;
};

const PostEventModal = ({ onClose }: PostEventModalProps) => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Welcome</Text>
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
        fontSize: 24,
        fontWeight: 'bold',
    },
});

export default PostEventModal;