import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    SafeAreaView,
    StatusBar,
    FlatList,
    RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useUserDetail } from "../../context/UserDetailContext";
import { useVideo } from "../../context/VideoContext";
import { MaterialIcons } from "@expo/vector-icons";
import { doc, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { auth, db } from "../../config/firebaseConfig";
import Common from "../../Components/Container/Common";

export default function Home() {
    const router = useRouter();
    const { userDetail } = useUserDetail();
    const { coursesData, getCourseProgress, getCoursesWithProgress } = useVideo();
    const [inProgressCourses, setInProgressCourses] = useState([]);
    const [notStartedCourses, setNotStartedCourses] = useState([]);
    const [recentConversations, setRecentConversations] = useState([]);
    const [greeting, setGreeting] = useState("Good Morning");
    const [refreshing, setRefreshing] = useState(false);

    // Set appropriate greeting based on time of day
    useEffect(() => {
        const currentHour = new Date().getHours();
        if (currentHour < 12) {
            setGreeting("Good Morning");
        } else if (currentHour < 18) {
            setGreeting("Good Afternoon");
        } else {
            setGreeting("Good Evening");
        }
    }, []);

    // Load data function that can be called on initial load and refresh
    const loadData = useCallback(async () => {
        // Process courses and categorize them
        if (coursesData && coursesData.length > 0) {
            // Get all courses with progress
            const coursesWithProgress = getCoursesWithProgress();

            // Categorize courses into in-progress and not started
            const inProgress = [];
            const notStarted = [];

            coursesWithProgress.forEach(course => {
                if (course.progress.completed > 0) {
                    inProgress.push(course);
                } else {
                    notStarted.push(course);
                }
            });

            // Sort in-progress courses by completion percentage (descending)
            inProgress.sort((a, b) => b.progress.percentage - a.progress.percentage);

            setInProgressCourses(inProgress);
            setNotStartedCourses(notStarted);
        }

        // Load recent conversations
        if (auth.currentUser) {
            try {
                const conversationsRef = collection(db, "users", auth.currentUser.uid, "conversations");
                const q = query(conversationsRef, orderBy("timestamp", "desc"), limit(3));
                const querySnapshot = await getDocs(q);

                const conversations = [];
                querySnapshot.forEach(doc => {
                    conversations.push(doc.data());
                });

                setRecentConversations(conversations);
            } catch (error) {
                console.error("Error loading conversations:", error);
            }
        }
    }, [coursesData, getCoursesWithProgress]);

    // Load data on initial mount
    useEffect(() => {
        loadData();
    }, [loadData]);

    // Handle refresh
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    // Render a single course item in the horizontal list
    const renderCourseItem = ({ item }) => (
        <TouchableOpacity
            style={[
                styles.courseCard,
                { backgroundColor: item.backgroundColor || '#fff' }
            ]}
            onPress={() =>
                router.push({
                    pathname: '/courseView/courseDetails',
                    params: { id: item.id }
                })
            }
        >
            <Text style={styles.courseIcon}>{item.icon || '📚'}</Text>
            <Text style={styles.courseTitle}>{item.title}</Text>
            <Text style={styles.courseDescription} numberOfLines={2}>
                {item.description || `Learn ${item.title.toLowerCase()}`}
            </Text>

            <View style={styles.progressInfo}>
                <Text style={styles.chapterCount}>
                    {item.signs?.length || 0} Chapters
                </Text>
                <Text style={styles.completedCount}>
                    {item.progress.completed} Out of {item.progress.total} Completed
                </Text>
            </View>

            <View style={styles.progressBarContainer}>
                <View
                    style={[
                        styles.progressBar,
                        { width: `${item.progress.percentage}%` }
                    ]}
                />
            </View>

            {item.progress.percentage === 100 && (
                <View style={styles.completedBadge}>
                    <MaterialIcons name="check-circle" size={16} color="#FFFFFF" />
                    <Text style={styles.completedBadgeText}>Completed</Text>
                </View>
            )}
        </TouchableOpacity>
    );

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

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar backgroundColor="#D0F3DA" barStyle="dark-content" />
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={["#155658"]}
                        tintColor={"#155658"}
                    />
                }
            >
                <Common />

                {/* User Greeting */}
                <View style={styles.greetingContainer}>
                    <Text style={styles.greeting}>{greeting},</Text>
                    <Text style={styles.userName}>{userDetail?.name || "Friend"}</Text>
                    <Text style={styles.startedText}>Let's Get Started!</Text>
                </View>

                {/* Progress Section */}
                <View style={styles.sectionContainer}>

                    {/* Courses In Progress */}
                    {inProgressCourses.length > 0 ? (
                        <View>
                            <Text style={styles.subsectionTitle}>Courses In Progress</Text>
                            <FlatList
                                data={inProgressCourses}
                                renderItem={renderCourseItem}
                                keyExtractor={item => item.id}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.horizontalList}
                            />
                        </View>
                    ) : (
                        <Text style={styles.noProgressText}>
                            You haven't started any courses yet. Try one below!
                        </Text>
                    )}

                    {/* New Courses to Try */}
                    {notStartedCourses.length > 0 && (
                        <View style={styles.newCoursesSection}>
                            <Text style={styles.subsectionTitle}>New Courses to Try</Text>
                            <FlatList
                                data={notStartedCourses}
                                renderItem={renderNewCourseItem}
                                keyExtractor={item => item.id}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.horizontalList}
                            />
                        </View>
                    )}
                </View>

                {/* Feature Cards */}
                <View style={styles.featureCardsContainer}>
                    {/* Sign to Text Card */}
                    <TouchableOpacity
                        style={[styles.featureCard, styles.signToTextCard]}
                        onPress={() => router.push("/(tabs)/signToText")}
                    >
                        <View style={styles.featureCardContent}>
                            <Text style={styles.featureCardTitle}>Sign language - to- Text</Text>
                        </View>
                        <Image
                            source={require("../../assets/images/signtext.png")}
                            style={styles.featureCardImage}
                        />
                    </TouchableOpacity>

                    {/* Text to Sign Card */}
                    <TouchableOpacity
                        style={[styles.featureCard, styles.textToSignCard]}
                        onPress={() => router.push("/(tabs)/textToSign")}
                    >
                        <View style={styles.featureCardContent}>
                            <Text style={styles.featureCardTitle}>Text - to - Sign language</Text>
                        </View>
                        <Image
                            source={require("../../assets/images/textsign.png")}
                            style={styles.featureCardImage}
                        />
                    </TouchableOpacity>
                </View>

                {/* Saved Conversations */}
                {recentConversations.length > 0 && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Saved Conversations</Text>
                        <View style={styles.conversationsContainer}>
                            {recentConversations.map((conversation, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.conversationCard}
                                    onPress={() =>
                                        router.push({
                                            pathname: "/(tabs)/textToSign",
                                            params: {
                                                text: conversation.text,
                                                translated: conversation.translated,
                                                language: conversation.language,
                                                fromSaved: true
                                            }
                                        })
                                    }
                                >
                                    <Text
                                        style={styles.conversationText}
                                        numberOfLines={2}
                                        ellipsizeMode="tail"
                                    >
                                        {conversation.text}
                                    </Text>
                                    <Text style={styles.conversationDate}>
                                        {new Date(conversation.timestamp).toLocaleDateString()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#D0F3DA",
    },
    container: {
        flex: 1,
        padding: 25,
    },
    contentContainer: {
        paddingBottom: 80, // Extra padding for tab bar
    },
    greetingContainer: {
        marginTop: 10,
    },
    greeting: {
        fontSize: 16,
        color: "#666",
    },
    userName: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#000",
        marginTop: 5,
    },
    startedText: {
        fontSize: 16,
        color: "#333",
        marginTop: 5,
    },
    sectionContainer: {
        marginTop: 25,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#000",
        marginBottom: 12,
    },
    subsectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#000",
        marginBottom: 10,
    },
    noProgressText: {
        fontSize: 14,
        color: "#666",
        fontStyle: "italic",
        marginBottom: 20,
    },
    horizontalList: {
        paddingRight: 20,
        paddingBottom: 5,
    },
    courseCard: {
        width: 200,
        height: 180,
        borderRadius: 16,
        marginRight: 16,
        padding: 16,
        position: 'relative',
    },
    courseIcon: {
        fontSize: 30,
        marginBottom: 8,
    },
    courseIconNew: {
        fontSize: 50,
        marginBottom: 8,
        alignSelf: 'center'
    },
    courseTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#333",
        marginBottom: 4,
    },
    courseDescription: {
        fontSize: 12,
        color: "#555",
        marginBottom: 10,
        flex: 1,
    },
    progressInfo: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    chapterCount: {
        fontSize: 10,
        color: "#000",
    },
    completedCount: {
        fontSize: 10,
        color: "#333",
        fontWeight: "500",
    },
    progressBarContainer: {
        height: 6,
        backgroundColor: "#F7B316",
        borderRadius: 3,
        overflow: "hidden",
    },
    progressBar: {
        height: "100%",
        backgroundColor: "#155658",
        borderRadius: 3,
    },
    completedBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#4CAF50',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    completedBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 4,
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
    newCourseTitle: {
        fontSize: 17,
        fontWeight: "900",
        color: "#000",
        marginBottom: 4,
        marginTop: -5,
        textAlign: 'center'
    },
    newCourseChapters: {
        fontSize: 12,
        color: "#333",
        alignSelf: 'flex-end',
    },
    featureCardsContainer: {
        marginTop: 25,
    },
    featureCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 15,
        borderRadius: 16,
        marginBottom: 15,
    },
    signToTextCard: {
        backgroundColor: "#155658",
    },
    textToSignCard: {
        backgroundColor: "#155658",
    },
    featureCardContent: {
        flex: 1,
    },
    featureCardTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#fff",
        paddingRight: 10,
    },
    featureCardImage: {
        width: 80,
        height: 80,
        resizeMode: "contain",
    },
    conversationsContainer: {
        marginTop: 5,
    },
    conversationCard: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    conversationText: {
        fontSize: 14,
        color: "#333",
    },
    conversationDate: {
        fontSize: 12,
        color: "#999",
        marginTop: 5,
        textAlign: "right",
    },
});