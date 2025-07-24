-- Temporarily disable RLS for knowledge tracking tables to debug the authentication issue
-- This should only be used for debugging - RLS should be re-enabled once we fix the auth bridge

ALTER TABLE user_knowledge_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_definitions DISABLE ROW LEVEL SECURITY; 
ALTER TABLE question_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE pm_preference_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE learning_analytics DISABLE ROW LEVEL SECURITY;

-- You can re-enable with:
-- ALTER TABLE user_knowledge_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE vocabulary_definitions ENABLE ROW LEVEL SECURITY; 
-- ALTER TABLE question_responses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pm_preference_profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE learning_analytics ENABLE ROW LEVEL SECURITY;