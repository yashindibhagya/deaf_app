import { View, Text, Pressable, useWindowDimensions } from 'react-native'
import React from 'react'
import { Image, StyleSheet } from 'react-native'
import { imageAssets } from '../../constants/Option'
import Ionicons from '@expo/vector-icons/Ionicons';
import Button from '../../Components/Shared/Button'
import { useRouter } from 'expo-router';
import { useVideo } from '../../context/VideoContext';

export default function Intro({ course }) {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const { userProgress } = useVideo();

    const handleStartNow = () => {
        // Find the first incomplete chapter
        let nextChapterIndex = 0;

        // Ensure chapters array exists
        if (course?.chapters && course.chapters.length > 0) {
            // Check if any chapter has a signId field
            const hasSignIds = course.chapters.some(chapter => chapter.signId);

            if (hasSignIds) {
                // Find first incomplete chapter by checking signId in userProgress
                for (let i = 0; i < course.chapters.length; i++) {
                    const chapter = course.chapters[i];
                    if (chapter.signId && !userProgress[chapter.signId]?.completed) {
                        nextChapterIndex = i;
                        break;
                    }
                }
            }
            // If no chapters have signId or all are completed, start from the first one
        }

        // Navigate to chapter view
        router.push({
            pathname: '/chapterView',
            params: {
                chapterParams: JSON.stringify(course?.chapters[nextChapterIndex]),
                docId: course?.docId,
                chapterIndex: nextChapterIndex
            }
        });
    };

    return (
        <View>
            <Image
                source={imageAssets[course?.bannerImage]}
                style={[styles.image, { width: width }]}
            />

            <View style={styles.courseName}>
                <Text style={styles.courseText}>{course?.courseName}</Text>

                <View style={styles.chapter}>
                    <Ionicons name="book-outline" size={20} color="#3c0061" />
                    <Text style={styles.chapterText}>
                        {course?.chapters?.length || 0} Chapters
                    </Text>
                </View>

                <Text style={styles.desc}>Description:</Text>
                <Text style={styles.description}>{course?.description || 'No description available'}</Text>

                <Button
                    text={'Start Now'}
                    onPress={handleStartNow}
                />
            </View>

            <Pressable
                style={{
                    position: 'absolute',
                    padding: 10
                }}
                onPress={() => router.back()}
            >
                <Ionicons name="arrow-back-outline" size={24} color="black" />
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    // Styles remain unchanged
    image: {
        height: 280,
        resizeMode: 'cover'
    },
    courseName: {
        padding: 20
    },
    courseText: {
        fontWeight: '900',
        fontSize: 25
    },
    chapter: {
        display: 'flex',
        flexDirection: 'row',
        gap: 5,
        alignItems: 'center',
        marginTop: 5
    },
    chapterText: {
        fontSize: 16,
        color: '#3c0061',
        fontWeight: '600'
    },
    desc: {
        fontWeight: 'bold',
        fontSize: 20,
        marginTop: 10
    },
    description: {
        fontSize: 14,
        fontWeight: '400',
        marginBottom: 20
    }
})