import { View, Text, StyleSheet, FlatList, TouchableOpacity, useWindowDimensions } from 'react-native'
import React from 'react'
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useVideo } from '../../context/VideoContext';

export default function Chapters({ course }) {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const { userProgress } = useVideo();

    // Correctly check if chapter is completed by checking signId in userProgress
    const isChapterCompleted = (chapter) => {
        if (!chapter || !chapter.signId) return false;
        return !!userProgress[chapter.signId]?.completed;
    };

    return (
        <View style={[styles.container, { width: width - 40 }]}>
            <Text style={styles.chapter}>Chapters</Text>
            <FlatList
                data={course?.chapters}
                renderItem={({ item, index }) => (
                    <TouchableOpacity
                        onPress={() => {
                            router.push({
                                pathname: '/chapterView',
                                params: {
                                    chapterParams: JSON.stringify(item),
                                    docId: course?.docId,
                                    chapterIndex: index
                                }
                            })
                        }}
                        style={{
                            padding: 18,
                            borderWidth: 0.5,
                            borderRadius: 15,
                            marginTop: 10,
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}
                    >
                        <View style={styles.chapterView}>
                            <Text style={styles.chapterText}>{index + 1}.</Text>
                            <Text style={styles.chapterText}>{item.chapterTitle} </Text>
                        </View>

                        {isChapterCompleted(item) ?
                            <AntDesign name="checkcircle" size={24} color="black" />
                            : <Ionicons name="play-circle" size={24} color="#3c0061" />
                        }
                    </TouchableOpacity>
                )}
                keyExtractor={(item, index) => index.toString()}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        alignSelf: 'center',
    },
    chapter: {
        fontWeight: 'bold',
        fontSize: 25
    },
    chapterText: {
        fontSize: 18
    },
    chapterView: {
        display: 'flex',
        flexDirection: 'row',
        gap: 10
    }
})