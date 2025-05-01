import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

const NewCourses = ({ courses }) => {
    const router = useRouter();

    // Render a course item for new courses
    const renderNewCourseItem = ({ item }) => (
        <TouchableOpacity
            style={[
                styles.newCourseCard,
                { backgroundColor: item.backgroundColor || '#fff' }
            ]}
            onPress={() =>
                router.push({
                    pathname: '/courseView/courseDetails',
                    params: { id: item.id }
                })
            }
        >
            <Text style={styles.courseIconNew}>{item.icon || '📚'}</Text>
            <Text style={styles.newCourseTitle}>{item.title}</Text>
        </TouchableOpacity>
    );

    if (courses.length === 0) {
        return null;
    }

    return (
        <View style={styles.newCoursesSection}>
            <Text style={styles.subsectionTitle}>New Courses to Try</Text>
            <FlatList
                data={courses}
                renderItem={renderNewCourseItem}
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    subsectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#000",
        marginBottom: 10,
    },
    horizontalList: {
        paddingRight: 20,
        paddingBottom: 5,
    },
    newCoursesSection: {
        marginTop: 20,
    },
    newCourseCard: {
        width: 140,
        height: 140,
        borderRadius: 16,
        marginRight: 16,
        padding: 16,
    },
    courseIconNew: {
        fontSize: 50,
        marginBottom: 8,
        alignSelf: 'center'
    },
    newCourseTitle: {
        fontSize: 17,
        fontWeight: "900",
        color: "#000",
        marginBottom: 4,
        marginTop: -5,
        textAlign: 'center'
    },
});

export default NewCourses;