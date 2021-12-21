echo
echo ------------------------------------------------------------------------------------------------------------------------
echo
echo KEYCLOAK INITIALISATION SCRIPT
echo
echo ------------------------------------------------------------------------------------------------------------------------
echo
echo "Waiting for containers to stabilise after startup..."
sleep 10

echo
echo "Install JSON Query..."
#install jq for JSON querying
microdnf install jq > /dev/null

PATH=$PATH:/opt/jboss/keycloak/bin
OUTPUT_PATH=/docker-entrypoint-initdb.d

echo
echo "Login to Keycloak..."

# Login
kcadm.sh config credentials --server "${KCSRV}/auth" --realm master --user ${KEYCLOAK_USER} --password ${KEYCLOAK_PASSWORD} --client admin-cli

# Generate realm template
cat $OUTPUT_PATH/template_realm.json | sed "s|{{REALM_ID}}|${REALM_ID}|" | sed "s|{{REALM_NAME}}|${REALM_NAME}|" | sed "s|{{SMTP_PASSWORD}}|${SMTP_PASSWORD}|" | sed "s|{{SMTP_SENDER_NAME}}|${SMTP_SENDER_NAME}|"  > ${OUTPUT_PATH}/realm.json

# Create the realm
echo
echo "Create the realm: "${REALM_ID}
kcadm.sh create realms -s realm=${REALM_ID} -s enabled=true
kcadm.sh create partialImport -r ${REALM_ID} -s ifResourceExists=SKIP -f ${REALM_JSON}
kcadm.sh create roles -r ${REALM_ID} -s name=${APP_ADMIN_ROLE} -s description='Tenant admin can manage users within the realm'

# Set the default role assigned to all users
echo
echo "Create the default role for the realm: "${DEFAULT_ROLE}
kcadm.sh add-roles    -r ${REALM_ID} --rname default-roles-${REALM_ID} --rolename ${DEFAULT_ROLE}

echo
echo "Create tenant admin user: "${APP_ADMIN}" with password: "${USER_PW}
kcadm.sh create users -r ${REALM_ID} -s username=${APP_ADMIN} -s enabled=true
kcadm.sh set-password -r ${REALM_ID} --username=${APP_ADMIN} --new-password ${USER_PW}

echo "Assign admin and tenant_admin roles: "${APP_ADMIN}" with password: "${USER_PW}
kcadm.sh add-roles    -r ${REALM_ID} --uusername ${APP_ADMIN} --rolename "admin" 
kcadm.sh add-roles    -r ${REALM_ID} --uusername ${APP_ADMIN} --rolename ${APP_ADMIN_ROLE}  

echo
echo "Create realm test user: "${APP_USER}" with password: "${USER_PW}
kcadm.sh create users -r ${REALM_ID} -s username=${APP_USER} -s enabled=true
kcadm.sh set-password -r ${REALM_ID} --username=${APP_USER} --new-password ${USER_PW}
kcadm.sh add-roles    -r ${REALM_ID} --uusername ${APP_USER} --rolename ${DEFAULT_ROLE}  

echo
echo "Capture the realm public key..."
#export the public key 
export KEY_TEXT=$(curl -s --request GET --url ${KCSRV}/auth/realms/${REALM_ID} | jq -r -c .public_key | sed -e 's/"//g')
export PUBLIC_KEY='-----BEGIN PUBLIC KEY-----\n'${KEY_TEXT}'\n-----END PUBLIC KEY-----' 
export KC_KEY='HASURA_GRAPHQL_JWT_SECRET='"'"'{"type": "RS256", "key": "'${PUBLIC_KEY}'"}'"'"

echo ${KC_KEY} > ${OUTPUT_PATH}/private_data/token.env
echo "Captured the realm public key into:"${OUTPUT_PATH}"/private_data/token.env"

# Test login with user credentials
echo 'Test authentication - request token for: '${APP_ADMIN}
export AUTH_TOKEN=$(curl -s --request POST --url ${KCSRV}/auth/realms/${REALM_ID}/protocol/openid-connect/token   --header 'Content-Type: application/x-www-form-urlencoded'   --data username=${APP_ADMIN}   --data password=${USER_PW}   --data grant_type=password   --data client_id=${CLIENT}  | jq -r -c .access_token | sed -e 's/"//g')
echo "Bearer "${AUTH_TOKEN} > ${OUTPUT_PATH}/private_data/auth_token.json

echo "Bearer token captured into:"${OUTPUT_PATH}"/private_data/auth_token.json"

# This command will delete the whole realm, users, clients...everything
#kcadm.sh delete realms/${REALM_ID}