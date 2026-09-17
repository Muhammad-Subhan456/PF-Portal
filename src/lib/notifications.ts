// Notification system for student dashboard
// Replaces Recent Activity with a proper notification system

import { getAllLabs, getAllAssignments, getAllQuizzes, isSolutionVisible } from './content';
import { getStudentGradeData, getGradeSheetConfig } from './googleSheets';
import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  type: 'grade_added' | 'new_assignment' | 'new_lab' | 'new_quiz' | 'deadline_approaching' | 'solution_available' | 'deadline_passed';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

/**
 * Get all notifications for a student
 */
export async function getStudentNotifications(rollNumber: string, section?: 'CS-F26-M' | 'CS-F26-A'): Promise<Notification[]> {
  const notifications: Notification[] = [];
  const now = new Date();

  try {
    // Get grade data to check for new grades
    const gradeData = await getStudentGradeData(rollNumber);
    const gradeSheetConfig = await getGradeSheetConfig(section || 'CS-F26-M');
    
    // Check for new grades - compare with last known state
    const previousGradeDataKey = `previousGradeData_${rollNumber}`;
    const previousGradeData = JSON.parse(localStorage.getItem(previousGradeDataKey) || '{}');
    const currentGradeData: Record<string, any> = {};
    const lastSyncTimeKey = `lastSyncTime_${rollNumber}`;
    const lastSyncTime = localStorage.getItem(lastSyncTimeKey);
    const lastSyncDate = lastSyncTime ? new Date(lastSyncTime) : null;
    
    gradeData.forEach((data) => {
      const syncedAt = new Date(data.synced_at);
      const tabName = data.tab_name;
      
      // Store current grade data for comparison
      currentGradeData[tabName] = data.data;
      
      const tabConfig = gradeSheetConfig?.tabs 
        ? (gradeSheetConfig.tabs as any[]).find((t: any) => t.name === tabName)
        : null;
      
      // Skip if tab is hidden
      if (tabConfig?.visible === false) {
        return;
      }
      
      const tabData = data.data as any;
      const hasGrades = Object.keys(tabData).some(key => {
        const value = tabData[key];
        const score = parseFloat(value);
        return !isNaN(score) && value !== '' && value !== null;
      });

      if (hasGrades) {
        // Check if data has changed from previous sync (check all tabs, not just newly synced)
        const previousData = previousGradeData[tabName];
        let hasChanged = false;
        
        if (!previousData) {
          // First time seeing this tab - notify
          hasChanged = true;
        } else {
          // Compare grade values - check for any new marks or updated marks
          const currentGradeValues = Object.keys(tabData)
            .filter(key => {
              const value = tabData[key];
              const score = parseFloat(value);
              return !isNaN(score) && value !== '' && value !== null && value !== undefined;
            })
            .map(key => ({ key, value: String(tabData[key]).trim() }))
            .sort((a, b) => a.key.localeCompare(b.key));
          
          const previousGradeValues = Object.keys(previousData)
            .filter(key => {
              const value = previousData[key];
              const score = parseFloat(value);
              return !isNaN(score) && value !== '' && value !== null && value !== undefined;
            })
            .map(key => ({ key, value: String(previousData[key]).trim() }))
            .sort((a, b) => a.key.localeCompare(b.key));
          
          // Check if there are new columns or changed values
          const hasNewColumns = currentGradeValues.some(cgv => 
            !previousGradeValues.find(pgv => pgv.key === cgv.key)
          );
          const hasChangedValues = currentGradeValues.some(cgv => {
            const prev = previousGradeValues.find(pgv => pgv.key === cgv.key);
            return prev && prev.value !== cgv.value;
          });
          
          hasChanged = hasNewColumns || hasChangedValues;
        }

        if (hasChanged) {
          // Create a unique ID based on tab and timestamp
          const notificationId = `grade-${tabName}-${data.roll_number}-${Math.floor(syncedAt.getTime() / 1000)}`;
          notifications.push({
            id: notificationId,
            type: 'grade_added',
            title: `Grades Updated: ${tabName}`,
            message: `Your ${tabName} grades have been updated. Check your grades page for details.`,
            timestamp: syncedAt.toISOString(),
            read: false,
            link: '/grades',
          });
        }
      }
    });
    
    // Update stored previous grade data and sync time
    localStorage.setItem(previousGradeDataKey, JSON.stringify(currentGradeData));
    if (gradeData.length > 0) {
      const latestSync = gradeData.reduce((latest, data) => {
        const syncTime = new Date(data.synced_at);
        return syncTime > latest ? syncTime : latest;
      }, new Date(0));
      localStorage.setItem(lastSyncTimeKey, latestSync.toISOString());
    }

    // Get labs, assignments, quizzes
    const [labs, assignments, quizzes] = await Promise.all([
      getAllLabs(),
      getAllAssignments(),
      getAllQuizzes(),
    ]);

    // Check for new labs - compare with last known labs
    const lastLabsKey = `lastLabs_${rollNumber}`;
    const lastLabs = JSON.parse(localStorage.getItem(lastLabsKey) || '[]');
    const currentLabIds = labs.map(l => l.id);
    const newLabs = labs.filter(lab => !lastLabs.includes(lab.id));
    
    newLabs.forEach((lab) => {
      notifications.push({
        id: `new-lab-${lab.id}`,
        type: 'new_lab',
        title: `New Lab: Lab ${lab.lab_number}`,
        message: `Lab ${lab.lab_number}: ${lab.title} is now available.`,
        timestamp: lab.created_at,
        read: false,
        link: '/materials/labs',
      });
    });
    
    localStorage.setItem(lastLabsKey, JSON.stringify(currentLabIds));

    // Check if solution just became available for all labs
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    labs.forEach((lab) => {
      const solutionFiles = lab.lab_files?.filter(f => f.file_type === 'solution') || [];
      if (solutionFiles.length > 0 && isSolutionVisible(lab) && lab.solution_visible_after) {
        const solutionDate = new Date(lab.solution_visible_after);
        // If solution became available in last 7 days
        if (solutionDate >= sevenDaysAgo && solutionDate <= now) {
          notifications.push({
            id: `solution-lab-${lab.id}`,
            type: 'solution_available',
            title: `Solution Available: Lab ${lab.lab_number}`,
            message: `The solution for Lab ${lab.lab_number}: ${lab.title} is now available.`,
            timestamp: solutionDate.toISOString(),
            read: false,
            link: '/materials/labs',
          });
        }
      }
    });

    // Check for new assignments - compare with last known assignments
    const lastAssignmentsKey = `lastAssignments_${rollNumber}`;
    const lastAssignments = JSON.parse(localStorage.getItem(lastAssignmentsKey) || '[]');
    const currentAssignmentIds = assignments.map(a => a.id);
    const newAssignments = assignments.filter(assignment => !lastAssignments.includes(assignment.id));
    
    newAssignments.forEach((assignment) => {
      notifications.push({
        id: `new-assignment-${assignment.id}`,
        type: 'new_assignment',
        title: `New Assignment: Assignment ${assignment.assignment_number}`,
        message: `Assignment ${assignment.assignment_number}: ${assignment.title} has been posted.`,
        timestamp: assignment.created_at,
        read: false,
        link: '/materials/assignments',
      });
    });
    
    localStorage.setItem(lastAssignmentsKey, JSON.stringify(currentAssignmentIds));

    // Check for approaching deadlines (within 3 days) for all assignments
    assignments.forEach((assignment) => {
      // Check for approaching deadlines (within 3 days)
      if (assignment.submission_deadline && assignment.status === 'active') {
        const deadline = new Date(assignment.submission_deadline);
        const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDeadline > 0 && daysUntilDeadline <= 3) {
          notifications.push({
            id: `deadline-assignment-${assignment.id}`,
            type: 'deadline_approaching',
            title: `Deadline Approaching: Assignment ${assignment.assignment_number}`,
            message: `Assignment ${assignment.assignment_number} is due in ${daysUntilDeadline} day${daysUntilDeadline > 1 ? 's' : ''}.`,
            timestamp: now.toISOString(),
            read: false,
            link: '/materials/assignments',
          });
        }

        // Check for passed deadlines
        if (deadline < now) {
          notifications.push({
            id: `deadline-passed-assignment-${assignment.id}`,
            type: 'deadline_passed',
            title: `Deadline Passed: Assignment ${assignment.assignment_number}`,
            message: `The deadline for Assignment ${assignment.assignment_number} has passed.`,
            timestamp: deadline.toISOString(),
            read: false,
            link: '/materials/assignments',
          });
        }
      }
    });

    // Check for new quizzes - compare with last known quizzes
    const lastQuizzesKey = `lastQuizzes_${rollNumber}`;
    const lastQuizzes = JSON.parse(localStorage.getItem(lastQuizzesKey) || '[]');
    const currentQuizIds = quizzes.map(q => q.id);
    const newQuizzes = quizzes.filter(quiz => !lastQuizzes.includes(quiz.id));
    
    newQuizzes.forEach((quiz) => {
      notifications.push({
        id: `new-quiz-${quiz.id}`,
        type: 'new_quiz',
        title: `New Quiz: Quiz ${quiz.quiz_number}`,
        message: `Quiz ${quiz.quiz_number}: ${quiz.title} has been posted.`,
        timestamp: quiz.created_at,
        read: false,
        link: '/materials/quizzes',
      });
    });
    
    localStorage.setItem(lastQuizzesKey, JSON.stringify(currentQuizIds));

    // Sort by timestamp (most recent first)
    notifications.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

/**
 * Mark notification as read (store in localStorage for now)
 */
export function markNotificationAsRead(notificationId: string): void {
  const readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]');
  if (!readNotifications.includes(notificationId)) {
    readNotifications.push(notificationId);
    localStorage.setItem('readNotifications', JSON.stringify(readNotifications));
  }
}

/**
 * Mark all notifications as read
 */
export function markAllNotificationsAsRead(): void {
  const notifications = JSON.parse(localStorage.getItem('allNotifications') || '[]');
  const readNotifications = notifications.map((n: Notification) => n.id);
  localStorage.setItem('readNotifications', JSON.stringify(readNotifications));
  // Also update the notifications in storage to mark them as read
  const updatedNotifications = notifications.map((n: Notification) => ({ ...n, read: true }));
  localStorage.setItem('allNotifications', JSON.stringify(updatedNotifications));
}

/**
 * Get unread notification count
 */
export function getUnreadCount(notifications: Notification[]): number {
  const readNotifications = JSON.parse(localStorage.getItem('readNotifications') || '[]');
  return notifications.filter(n => !readNotifications.includes(n.id)).length;
}
