// Google Sheets Sync Edge Function
// Syncs grade data from Google Sheets to Supabase

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

// CORS headers helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Google Sheets API v4 endpoint
const GOOGLE_SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'

interface ServiceAccount {
  type: string
  project_id: string
  private_key_id: string
  private_key: string
  client_email: string
  client_id: string
  auth_uri: string
  token_uri: string
}

/**
 * Decode base64
 */
function base64Decode(str: string): Uint8Array {
  const padding = str.length % 4
  const padded = str + '='.repeat(padding ? 4 - padding : 0)
  const binary = atob(padded)
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)))
}

/**
 * Encode base64url
 */
function base64UrlEncode(bytes: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...bytes))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Create a JWT for Google API authentication
 */
async function createJWT(serviceAccount: ServiceAccount): Promise<string> {
  // Prepare private key
  const privateKeyPem = serviceAccount.private_key.replace(/\\n/g, '\n')
  const keyData = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  
  const keyBuffer = base64Decode(keyData)
  
  // Import key
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  )

  // Create JWT header and payload
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: serviceAccount.token_uri,
    exp: now + 3600,
    iat: now,
  }

  // Encode header and payload
  const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)))
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)))
  const unsignedToken = `${encodedHeader}.${encodedPayload}`

  // Sign
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsignedToken)
  )

  const encodedSignature = base64UrlEncode(new Uint8Array(signature))
  
  return `${unsignedToken}.${encodedSignature}`
}

/**
 * Get access token from Google
 */
async function getAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  const jwt = await createJWT(serviceAccount)
  
  const response = await fetch(serviceAccount.token_uri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get access token: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

/**
 * Get all sheet tabs (worksheets) from a Google Sheet
 */
async function getSheetTabs(sheetId: string, accessToken: string): Promise<string[]> {
  const response = await fetch(`${GOOGLE_SHEETS_API}/${sheetId}?fields=sheets.properties.title`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to get sheet tabs: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return data.sheets?.map((sheet: any) => sheet.properties.title) || []
}

/**
 * Fetch data from a specific tab
 */
async function fetchTabData(sheetId: string, tabName: string, accessToken: string): Promise<any[][]> {
  const range = encodeURIComponent(`${tabName}`)
  const response = await fetch(
    `${GOOGLE_SHEETS_API}/${sheetId}/values/${range}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to fetch tab data for ${tabName}: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return data.values || []
}

/**
 * Parse sheet data and extract roll numbers
 */
function parseSheetData(data: any[][]): {
  headers: string[]
  rows: any[][]
  rollNumberColumnIndex: number
} {
  if (!data || data.length === 0) {
    throw new Error('Sheet data is empty')
  }

  const headers = data[0].map((h: any) => String(h || '').trim())
  const rows = data.slice(1)
  
  // Find roll number column
  let rollNumberColumnIndex = 0
  const rollNumberIndex = headers.findIndex(h => 
    h.toLowerCase().includes('roll') || h.toLowerCase().includes('rollnumber')
  )
  if (rollNumberIndex !== -1) {
    rollNumberColumnIndex = rollNumberIndex
  }

  return {
    headers,
    rows,
    rollNumberColumnIndex,
  }
}

Deno.serve(async (req) => {
  try {
    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Get auth token from header (supabase.functions.invoke automatically includes it)
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Missing authorization header. Please ensure you are logged in.' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const token = authHeader.replace('Bearer ', '').replace('bearer ', '')
    
    // Verify token using service role key (has access to verify JWTs)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) {
      console.error('Token verification failed:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: authError?.message || 'Invalid authentication token' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    
    console.log('User authenticated:', user.email)

    // Initialize Supabase client with service role key for database operations
    const supabase = supabaseClient

    // Get request body
    let sheetId: string
    try {
      const body = await req.json()
      sheetId = body.sheetId
    } catch (error) {
      console.error('Error parsing request body:', error)
      return new Response(
        JSON.stringify({ error: 'Invalid request body', message: 'Could not parse JSON' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    
    if (!sheetId) {
      return new Response(
        JSON.stringify({ error: 'sheetId is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get service account from secrets
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')
    if (!serviceAccountJson) {
      console.error('GOOGLE_SERVICE_ACCOUNT secret not found')
      return new Response(
        JSON.stringify({ 
          error: 'Configuration error', 
          message: 'GOOGLE_SERVICE_ACCOUNT secret not configured. Please set it in Supabase Dashboard > Edge Functions > Secrets.' 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    let serviceAccount: ServiceAccount
    try {
      // Try to parse the JSON - it might be double-encoded or escaped
      let jsonString = serviceAccountJson.trim()
      
      // Remove any leading/trailing quotes if present
      if ((jsonString.startsWith('"') && jsonString.endsWith('"')) || 
          (jsonString.startsWith("'") && jsonString.endsWith("'"))) {
        jsonString = jsonString.slice(1, -1)
      }
      
      // Try to unescape if it's escaped JSON string
      try {
        jsonString = JSON.parse(`"${jsonString}"`) as string
      } catch {
        // If that fails, use the original string
      }
      
      // Now parse the actual JSON
      serviceAccount = JSON.parse(jsonString)
      
      // Validate required fields
      if (!serviceAccount.private_key || !serviceAccount.client_email || !serviceAccount.token_uri) {
        throw new Error('Missing required fields in service account JSON')
      }
    } catch (error: any) {
      console.error('Error parsing GOOGLE_SERVICE_ACCOUNT:', error)
      console.error('First 200 chars of secret:', serviceAccountJson.substring(0, 200))
      return new Response(
        JSON.stringify({ 
          error: 'Configuration error', 
          message: `Invalid GOOGLE_SERVICE_ACCOUNT JSON format: ${error.message}. Please check the secret format in Supabase Dashboard.` 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get access token
    let accessToken: string
    try {
      accessToken = await getAccessToken(serviceAccount)
    } catch (error: any) {
      console.error('Error getting Google access token:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Google API error', 
          message: error.message || 'Failed to authenticate with Google Sheets API' 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get all tabs
    let tabs: string[]
    try {
      tabs = await getSheetTabs(sheetId, accessToken)
    } catch (error: any) {
      console.error('Error getting sheet tabs:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Google Sheets API error', 
          message: error.message || 'Failed to fetch sheet tabs. Make sure the sheet is shared with the service account.' 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    
    if (tabs.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'No tabs found in sheet',
          tabsSynced: 0,
          studentsSynced: 0,
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    let totalStudentsSynced = 0
    const syncedTabs: string[] = []
    const tabsInfo: Array<{
      name: string
      columns: string[]
      rollNumberColumn: string
    }> = []

    // Process each tab
    for (const tabName of tabs) {
      try {
        // Fetch tab data
        const rawData = await fetchTabData(sheetId, tabName, accessToken)
        
        if (rawData.length === 0) {
          console.log(`Tab ${tabName} is empty, deleting all existing data for this tab`)
          // If tab is empty, delete all existing data for this tab
          const { error: deleteError } = await supabase
            .from('grade_data')
            .delete()
            .eq('sheet_id', sheetId)
            .eq('tab_name', tabName)
          
          if (deleteError) {
            console.error(`Error deleting empty tab data for ${tabName}:`, deleteError)
          }
          continue
        }

        // Parse data
        const { headers, rows, rollNumberColumnIndex } = parseSheetData(rawData)
        
        // Store tab info (columns detected)
        const rollNumberColumn = headers[rollNumberColumnIndex] || 'Roll Number'
        tabsInfo.push({
          name: tabName,
          columns: headers.filter(h => h), // Filter out empty headers
          rollNumberColumn: rollNumberColumn,
        })

        // Collect all roll numbers that exist in the current sheet
        const rollNumbersInSheet = new Set<string>()
        
        // Cache data for each student
        for (const row of rows) {
          if (row.length <= rollNumberColumnIndex) continue
          
          const rollNumber = String(row[rollNumberColumnIndex] || '').trim().toLowerCase()
          if (!rollNumber) continue

          rollNumbersInSheet.add(rollNumber)

          // Create data object with all columns
          const studentData: Record<string, any> = {}
          headers.forEach((header, index) => {
            if (header) {
              studentData[header] = row[index] || ''
            }
          })

          // Upsert grade data
          const { error } = await supabase
            .from('grade_data')
            .upsert({
              sheet_id: sheetId,
              tab_name: tabName,
              roll_number: rollNumber,
              data: studentData,
              synced_at: new Date().toISOString(),
            }, {
              onConflict: 'sheet_id,tab_name,roll_number',
            })

          if (error) {
            console.error(`Error caching data for ${rollNumber} in ${tabName}:`, error)
          } else {
            totalStudentsSynced++
          }
        }

        // CRITICAL: Delete grade_data entries for this tab that are NOT in the current sheet
        // This ensures the database exactly matches the sheet (removes deleted rows)
        if (rollNumbersInSheet.size > 0) {
          // Get all existing roll numbers for this tab/sheet
          const { data: existingData, error: fetchError } = await supabase
            .from('grade_data')
            .select('roll_number')
            .eq('sheet_id', sheetId)
            .eq('tab_name', tabName)
          
          if (!fetchError && existingData) {
            // Find roll numbers that exist in DB but not in current sheet
            const rollNumbersToDelete = existingData
              .map(item => item.roll_number)
              .filter(rollNum => {
                const rollNumLower = String(rollNum || '').toLowerCase().trim()
                return rollNumLower && !rollNumbersInSheet.has(rollNumLower)
              })
            
            // Delete orphaned entries
            if (rollNumbersToDelete.length > 0) {
              console.log(`Deleting ${rollNumbersToDelete.length} removed rows from ${tabName}`)
              const { error: deleteError } = await supabase
                .from('grade_data')
                .delete()
                .eq('sheet_id', sheetId)
                .eq('tab_name', tabName)
                .in('roll_number', rollNumbersToDelete)
              
              if (deleteError) {
                console.error(`Error deleting removed rows from ${tabName}:`, deleteError)
              } else {
                console.log(`Successfully deleted ${rollNumbersToDelete.length} removed rows from ${tabName}`)
              }
            }
          }
        } else {
          // If no valid roll numbers in sheet, delete all data for this tab
          // This handles the case where a tab has rows but all roll numbers are empty/invalid
          console.log(`No valid roll numbers in ${tabName}, deleting all existing data for this tab`)
          const { error: deleteError } = await supabase
            .from('grade_data')
            .delete()
            .eq('sheet_id', sheetId)
            .eq('tab_name', tabName)
          
          if (deleteError) {
            console.error(`Error deleting all data for ${tabName}:`, deleteError)
          } else {
            console.log(`Successfully deleted all data for empty tab ${tabName}`)
          }
        }

        syncedTabs.push(tabName)
        console.log(`Synced tab ${tabName}: ${rows.length} rows`)
      } catch (error) {
        console.error(`Error processing tab ${tabName}:`, error)
        // Continue with other tabs
      }
    }

    // Note: We don't update grade_sheets here - the admin interface handles that
    // This function just syncs data and returns detected tabs/columns info

    return new Response(
      JSON.stringify({
        success: true,
        tabsSynced: syncedTabs.length,
        studentsSynced: totalStudentsSynced,
        tabs: syncedTabs,
        tabsInfo: tabsInfo, // Return detected tabs and columns
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
        tabsSynced: 0,
        studentsSynced: 0,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
