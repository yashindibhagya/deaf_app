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
                        style={[
                            styles.chapterItem,
                            {
                                backgroundColor: isChapterCompleted(item)
                                    ? '#E8F5E9' // Light green for completed chapters
                                    : course?.backgroundColor || '#FFFFFF', // Use course color for uncompleted chapters
                            }
                        ]}
                    >
                        <View style={styles.chapterView}>
                            <Text style={[
                                styles.chapterText,
                                { color: isChapterCompleted(item) ? '#155658' : '#333' }
                            ]}>
                                {index + 1}.
                            </Text>
                            <Text style={[
                                styles.chapterText,
                                { color: isChapterCompleted(item) ? '#155658' : '#333' }
                            ]}>
                                {item.chapterTitle}
                            </Text>
                        </View>

                        {isChapterCompleted(item) ?
                            <AntDesign name="checkcircle" size={24} color="#155658" />
                            : <Ionicons name="play-circle" size={24} color="#155658" />
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
    chapterItem: {
        padding: 18,
        borderWidth: 0.5,
        borderColor: 'rgba(0,0,0,0.1)',
        borderRadius: 15,
        marginTop: 10,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    chapterText: {
        fontSize: 18,
        fontWeight: '500',
    },
    chapterView: {
        display: 'flex',
        flexDirection: 'row',
        gap: 10
    }
})