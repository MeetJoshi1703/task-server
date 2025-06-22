const { supabase, supabaseAdmin } = require('../config/supabase');

class AuthController {
  async signUp(req, res) {
    try {
      console.log('Sign up request body:', req.body);
      const { name, email, password } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      // Create user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name
          }
        }
      });

      if (authError) {
        return res.status(400).json({ error: authError.message });
      }

      // Create profile if user was created successfully
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: authData.user.id,
            email: authData.user.email,
            full_name: name,
            avatar_url: name.charAt(0).toUpperCase(),
            role: 'member',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);

        if (profileError) {
          console.error('Profile creation error:', profileError);
          return res.status(500).json({ error: 'Failed to create profile' });
        }
      }

      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name,
          avatar: name.charAt(0).toUpperCase(),
          role: 'member',
          joinedAt: new Date().toISOString().split('T')[0]
        },
        access_token: authData.session?.access_token,
        refresh_token: authData.session?.refresh_token
      });
    } catch (error) {
      console.error('Sign up error:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }

  async signIn(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return res.status(401).json({ error: error.message });
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, role, created_at')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        return res.status(500).json({ error: 'Failed to fetch profile' });
      }

      res.json({
        message: 'Signed in successfully',
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.full_name,
          avatar: profile.avatar_url,
          role: profile.role,
          joinedAt: profile.created_at.split('T')[0]
        },
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });
    } catch (error) {
      console.error('Sign in error:', error);
      res.status(500).json({ error: 'Failed to sign in' });
    }
  }

  async signOut(req, res) {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      const { error } = await supabase.auth.signOut(token);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ message: 'Signed out successfully' });
    } catch (error) {
      console.error('Sign out error:', error);
      res.status(500).json({ error: 'Failed to sign out' });
    }
  }

  async refreshToken(req, res) {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token
      });

      if (error) {
        return res.status(401).json({ error: error.message });
      }

      res.json({
        message: 'Token refreshed successfully',
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({ error: 'Failed to refresh token' });
    }
  }

  async getProfile(req, res) {
    try {
      const userId = req.user.id;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, role, created_at')
        .eq('id', userId)
        .single();

      if (error) {
        return res.status(500).json({ error: 'Failed to fetch profile' });
      }

      res.json({
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        avatar: profile.avatar_url,
        role: profile.role,
        joinedAt: profile.created_at.split('T')[0]
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { name, avatar } = req.body;

      if (!name && !avatar) {
        return res.status(400).json({ error: 'Name or avatar is required' });
      }

      const updates = {
        updated_at: new Date().toISOString()
      };
      if (name) updates.full_name = name;
      if (avatar) updates.avatar_url = avatar;

      const { data: profile, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select('id, email, full_name, avatar_url, role, created_at')
        .single();

      if (error) {
        return res.status(500).json({ error: 'Failed to update profile' });
      }

      res.json({
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        avatar: profile.avatar_url,
        role: profile.role,
        joinedAt: profile.created_at.split('T')[0]
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  async updatePassword(req, res) {
    try {
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ error: 'New password is required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      const { error } = await supabase.auth.updateUser({
        password
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Update password error:', error);
      res.status(500).json({ error: 'Failed to update password' });
    }
  }

  async deleteAccount(req, res) {
    try {
      const userId = req.user.id;

      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ message: 'Account deleted successfully' });
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({ error: 'Failed to delete account' });
    }
  }
}

module.exports = new AuthController();