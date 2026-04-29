#!/bin/bash
BASE="http://localhost:3000/api"
RED='\033[0;31m'; GRN='\033[0;32m'; YEL='\033[1;33m'; CYN='\033[0;36m'; RST='\033[0m'
PASS=0; FAIL=0; WARN=0
RESULTS="D:/Code/RBAC/rbac_results.txt"
> "$RESULTS"

log_result() {
  local id="$1" st="$2" ex="$3" ac="$4" det="$5"
  echo "[$id] $st | Exp: $ex | Got: $ac | $det" >> "$RESULTS"
  if [ "$st" = "PASS" ]; then echo -e "  ${GRN}PASS${RST} [$id] $det"; ((PASS++))
  elif [ "$st" = "FAIL" ]; then echo -e "  ${RED}FAIL${RST} [$id] Exp: $ex | Got: $ac | $det"; ((FAIL++))
  else echo -e "  ${YEL}WARN${RST} [$id] $det"; ((WARN++))
  fi
}

login() { curl -s "$BASE/auth/login" -X POST -H "Content-Type: application/json" -d "{\"email\":\"$1\",\"password\":\"password123\"}"; }

echo -e "${CYN}=== LOGIN ===${RST}"
OT=$(login "owner@acme.com" | jq -r '.accessToken')
AT=$(login "admin@acme.com" | jq -r '.accessToken')
MT=$(login "manager@acme.com" | jq -r '.accessToken')
MeT=$(login "member@acme.com" | jq -r '.accessToken')
VT=$(login "viewer@acme.com" | jq -r '.accessToken')

dec() { echo "$1" | cut -d. -f2 | base64 -d 2>/dev/null; }
OID=$(dec "$OT" | jq -r '.sub')
AID=$(dec "$AT" | jq -r '.sub')
MID=$(dec "$MT" | jq -r '.sub')
MeID=$(dec "$MeT" | jq -r '.sub')
VID=$(dec "$VT" | jq -r '.sub')
echo "Owner=$OID"
echo "Admin=$AID"
echo "Manager=$MID"
echo "Member=$MeID"
echo "Viewer=$VID"

OP=$(curl -s "$BASE/auth/me" -H "Authorization: Bearer $OT")
ENG=$(echo "$OP" | jq -r '.memberships[] | select(.orgSlug=="acme-engineering") | .orgId')
PRD=$(echo "$OP" | jq -r '.memberships[] | select(.orgSlug=="acme-product") | .orgId')
echo "Eng=$ENG"
echo "Prod=$PRD"

api() {
  local m="$1" t="$2" p="$3" b="$4"
  if [ "$m" = "GET" ]; then
    curl -s -w "\n%{http_code}" "$BASE$p" -H "Authorization: Bearer $t" -H "Content-Type: application/json"
  else
    curl -s -w "\n%{http_code}" "$BASE$p" -X "$m" -H "Authorization: Bearer $t" -H "Content-Type: application/json" -d "$b"
  fi
}
pr() { local r="$1"; B=$(echo "$r" | sed '$d'); S=$(echo "$r" | tail -1); }
cget() { local r=$(api GET "$1" "/tasks/$2"); echo "$r" | tail -1; }

###############################################################################
echo -e "\n${CYN}=== PHASE 1: CREATE ===${RST}"
###############################################################################

echo -e "\n${CYN}[C-O-PUB] Owner > PUBLIC${RST}"
r=$(api POST "$OT" "/tasks" "{\"title\":\"[Owner]Public\",\"orgId\":\"$ENG\",\"visibility\":\"PUBLIC\",\"priority\":\"HIGH\",\"category\":\"Test\"}")
pr "$r"; TP=$(echo "$B" | jq -r '.id // empty')
[ "$S" = "201" ] && [ -n "$TP" ] && log_result "C-O-PUB" "PASS" "201" "$S" "Owner>Public id=$TP" || log_result "C-O-PUB" "FAIL" "201" "$S" "Owner>Public"

echo -e "\n${CYN}[C-O-PRIV] Owner > PRIVATE${RST}"
r=$(api POST "$OT" "/tasks" "{\"title\":\"[Owner]Private\",\"orgId\":\"$ENG\",\"visibility\":\"PRIVATE\",\"priority\":\"MEDIUM\",\"category\":\"Test\"}")
pr "$r"; TvPRIV=$(echo "$B" | jq -r '.id // empty')
[ "$S" = "201" ] && [ -n "$TvPRIV" ] && log_result "C-O-PRIV" "PASS" "201" "$S" "Owner>Private id=$TvPRIV" || log_result "C-O-PRIV" "FAIL" "201" "$S" "Owner>Private"

echo -e "\n${CYN}[C-O-ASGN] Owner > ASSIGNED_ONLY > assignee=Member${RST}"
r=$(api POST "$OT" "/tasks" "{\"title\":\"[Owner]Asgn>Member\",\"orgId\":\"$ENG\",\"visibility\":\"ASSIGNED_ONLY\",\"assigneeId\":\"$MeID\",\"priority\":\"LOW\",\"category\":\"Test\"}")
pr "$r"; TvA=$(echo "$B" | jq -r '.id // empty')
[ "$S" = "201" ] && [ -n "$TvA" ] && log_result "C-O-ASGN" "PASS" "201" "$S" "Owner>AssignedOnly>Member id=$TvA" || log_result "C-O-ASGN" "FAIL" "201" "$S" "Owner>AssignedOnly>Member"

echo -e "\n${CYN}[C-A-PUB] Admin > PUBLIC${RST}"
r=$(api POST "$AT" "/tasks" "{\"title\":\"[Admin]Public\",\"orgId\":\"$ENG\",\"visibility\":\"PUBLIC\",\"priority\":\"CRITICAL\",\"category\":\"Security\"}")
pr "$r"; AP=$(echo "$B" | jq -r '.id // empty')
[ "$S" = "201" ] && [ -n "$AP" ] && log_result "C-A-PUB" "PASS" "201" "$S" "Admin>Public id=$AP" || log_result "C-A-PUB" "FAIL" "201" "$S" "Admin>Public"

echo -e "\n${CYN}[C-A-PRIV] Admin > PRIVATE${RST}"
r=$(api POST "$AT" "/tasks" "{\"title\":\"[Admin]Private\",\"orgId\":\"$ENG\",\"visibility\":\"PRIVATE\",\"priority\":\"MEDIUM\",\"category\":\"Test\"}")
pr "$r"; APRIV=$(echo "$B" | jq -r '.id // empty')
[ "$S" = "201" ] && [ -n "$APRIV" ] && log_result "C-A-PRIV" "PASS" "201" "$S" "Admin>Private id=$APRIV" || log_result "C-A-PRIV" "FAIL" "201" "$S" "Admin>Private"

echo -e "\n${CYN}[C-M-PUB] Manager > PUBLIC > due=2026-05-15${RST}"
r=$(api POST "$MT" "/tasks" "{\"title\":\"[Manager]Public\",\"orgId\":\"$ENG\",\"visibility\":\"PUBLIC\",\"priority\":\"HIGH\",\"category\":\"Backend\",\"dueAt\":\"2026-05-15T00:00:00Z\"}")
pr "$r"; MP=$(echo "$B" | jq -r '.id // empty')
[ "$S" = "201" ] && [ -n "$MP" ] && log_result "C-M-PUB" "PASS" "201" "$S" "Manager>Public id=$MP" || log_result "C-M-PUB" "FAIL" "201" "$S" "Manager>Public"

echo -e "\n${CYN}[C-M-ASGN] Manager > PUBLIC > assignee=Member${RST}"
r=$(api POST "$MT" "/tasks" "{\"title\":\"[Manager]>Member\",\"orgId\":\"$ENG\",\"visibility\":\"PUBLIC\",\"assigneeId\":\"$MeID\",\"priority\":\"MEDIUM\"}")
pr "$r"; MA=$(echo "$B" | jq -r '.id // empty')
[ "$S" = "201" ] && [ -n "$MA" ] && log_result "C-M-ASGN" "PASS" "201" "$S" "Manager>assign>Member id=$MA" || log_result "C-M-ASGN" "FAIL" "201" "$S" "Manager>assign>Member"

echo -e "\n${CYN}[C-M-ASGN-V] Manager > ASSIGNED_ONLY > assignee=Viewer${RST}"
r=$(api POST "$MT" "/tasks" "{\"title\":\"[Manager]AsgnOnly>Viewer\",\"orgId\":\"$ENG\",\"visibility\":\"ASSIGNED_ONLY\",\"assigneeId\":\"$VID\",\"priority\":\"LOW\"}")
pr "$r"; MAV=$(echo "$B" | jq -r '.id // empty')
[ "$S" = "201" ] && [ -n "$MAV" ] && log_result "C-M-ASGN-V" "PASS" "201" "$S" "Manager>AssignedOnly>Viewer id=$MAV" || log_result "C-M-ASGN-V" "FAIL" "201" "$S" "Manager>AssignedOnly>Viewer"

echo -e "\n${CYN}[C-ME-PUB] Member > PUBLIC${RST}"
r=$(api POST "$MeT" "/tasks" "{\"title\":\"[Member]Public\",\"orgId\":\"$ENG\",\"visibility\":\"PUBLIC\",\"priority\":\"MEDIUM\",\"category\":\"Frontend\"}")
pr "$r"; MeP=$(echo "$B" | jq -r '.id // empty')
[ "$S" = "201" ] && [ -n "$MeP" ] && log_result "C-ME-PUB" "PASS" "201" "$S" "Member>Public id=$MeP" || log_result "C-ME-PUB" "FAIL" "201" "$S" "Member>Public"

echo -e "\n${CYN}[C-ME-SELF] Member > PUBLIC > assignee=self${RST}"
r=$(api POST "$MeT" "/tasks" "{\"title\":\"[Member]Self\",\"orgId\":\"$ENG\",\"visibility\":\"PUBLIC\",\"assigneeId\":\"$MeID\",\"priority\":\"LOW\"}")
pr "$r"; MeS=$(echo "$B" | jq -r '.id // empty')
[ "$S" = "201" ] && [ -n "$MeS" ] && log_result "C-ME-SELF" "PASS" "201" "$S" "Member>self-assign id=$MeS" || log_result "C-ME-SELF" "FAIL" "201" "$S" "Member>self-assign"

echo -e "\n${CYN}[C-ME-OTHER] Member > assignee=Admin (expect 403)${RST}"
r=$(api POST "$MeT" "/tasks" "{\"title\":\"[Member]Other\",\"orgId\":\"$ENG\",\"visibility\":\"PUBLIC\",\"assigneeId\":\"$AID\",\"priority\":\"LOW\"}")
pr "$r"
[ "$S" = "403" ] && log_result "C-ME-OTHER" "PASS" "403" "$S" "Member blocked assign to other" || log_result "C-ME-OTHER" "FAIL" "403" "$S" "Member should NOT assign to other"

echo -e "\n${CYN}[C-ME-PRIV] Member > PRIVATE${RST}"
r=$(api POST "$MeT" "/tasks" "{\"title\":\"[Member]Private\",\"orgId\":\"$ENG\",\"visibility\":\"PRIVATE\",\"priority\":\"MEDIUM\"}")
pr "$r"; MePR=$(echo "$B" | jq -r '.id // empty')
[ "$S" = "201" ] && [ -n "$MePR" ] && log_result "C-ME-PRIV" "PASS" "201" "$S" "Member>Private id=$MePR" || log_result "C-ME-PRIV" "FAIL" "201" "$S" "Member>Private"

echo -e "\n${CYN}[C-V] Viewer creates (expect 403)${RST}"
r=$(api POST "$VT" "/tasks" "{\"title\":\"[Viewer]\",\"orgId\":\"$ENG\",\"visibility\":\"PUBLIC\",\"priority\":\"LOW\"}")
pr "$r"
[ "$S" = "403" ] && log_result "C-V" "PASS" "403" "$S" "Viewer blocked create" || log_result "C-V" "FAIL" "403" "$S" "Viewer should NOT create"

echo -e "\n${CYN}[C-XORG] Member cross-org Product (expect 403)${RST}"
r=$(api POST "$MeT" "/tasks" "{\"title\":\"XOrg\",\"orgId\":\"$PRD\",\"visibility\":\"PUBLIC\",\"priority\":\"LOW\"}")
pr "$r"
[ "$S" = "403" ] && log_result "C-XORG" "PASS" "403" "$S" "Member blocked cross-org" || log_result "C-XORG" "FAIL" "403" "$S" "Member cross-org"

###############################################################################
echo -e "\n${CYN}=== PHASE 2: READ / VISIBILITY ===${RST}"
###############################################################################

echo -e "\n${CYN}--- Owner PUBLIC (id=$TP) ---${RST}"
for p in "Owner:$OT:200" "Admin:$AT:200" "Mgr:$MT:200" "Member:$MeT:200" "Viewer:$VT:200"; do
  IFS=':' read -r rl tk ex <<< "$p"
  s=$(cget "$tk" "$TP")
  [ "$s" = "$ex" ] && log_result "R-PUB-O-$rl" "PASS" "$ex" "$s" "$rl reads Owner Public" || log_result "R-PUB-O-$rl" "FAIL" "$ex" "$s" "$rl reads Owner Public"
done

echo -e "\n${CYN}--- Owner PRIVATE (id=$TvPRIV) ---${RST}"
for p in "Owner:$OT:200" "Admin:$AT:200" "Mgr:$MT:200" "Member:$MeT:404" "Viewer:$VT:404"; do
  IFS=':' read -r rl tk ex <<< "$p"
  s=$(cget "$tk" "$TvPRIV")
  [ "$s" = "$ex" ] && log_result "R-PRIV-O-$rl" "PASS" "$ex" "$s" "$rl reads Owner Private" || log_result "R-PRIV-O-$rl" "FAIL" "$ex" "$s" "$rl reads Owner Private ***LEAK***"
done

echo -e "\n${CYN}--- Owner ASSIGNED_ONLY assignee=Member (id=$TvA) ---${RST}"
for p in "Owner:$OT:200" "Admin:$AT:200" "Mgr:$MT:200" "Member:$MeT:200" "Viewer:$VT:404"; do
  IFS=':' read -r rl tk ex <<< "$p"
  s=$(cget "$tk" "$TvA")
  [ "$s" = "$ex" ] && log_result "R-ASGN-O-$rl" "PASS" "$ex" "$s" "$rl Owner AssignedOnly" || log_result "R-ASGN-O-$rl" "FAIL" "$ex" "$s" "$rl Owner AssignedOnly ***LEAK***"
done

echo -e "\n${CYN}--- Admin PRIVATE (id=$APRIV) ---${RST}"
for p in "Owner:$OT:200" "Admin:$AT:200" "Mgr:$MT:200" "Member:$MeT:404" "Viewer:$VT:404"; do
  IFS=':' read -r rl tk ex <<< "$p"
  s=$(cget "$tk" "$APRIV")
  [ "$s" = "$ex" ] && log_result "R-PRIV-A-$rl" "PASS" "$ex" "$s" "$rl reads Admin Private" || log_result "R-PRIV-A-$rl" "FAIL" "$ex" "$s" "$rl reads Admin Private ***LEAK***"
done

echo -e "\n${CYN}--- Admin PUBLIC (id=$AP) ---${RST}"
for p in "Owner:$OT:200" "Admin:$AT:200" "Mgr:$MT:200" "Member:$MeT:200" "Viewer:$VT:200"; do
  IFS=':' read -r rl tk ex <<< "$p"
  s=$(cget "$tk" "$AP")
  [ "$s" = "$ex" ] && log_result "R-PUB-A-$rl" "PASS" "$ex" "$s" "$rl reads Admin Public" || log_result "R-PUB-A-$rl" "FAIL" "$ex" "$s" "$rl reads Admin Public"
done

echo -e "\n${CYN}--- Member PRIVATE (id=$MePR) ---${RST}"
for p in "Owner:$OT:200" "Admin:$AT:200" "Mgr:$MT:200" "Member:$MeT:200" "Viewer:$VT:404"; do
  IFS=':' read -r rl tk ex <<< "$p"
  s=$(cget "$tk" "$MePR")
  [ "$s" = "$ex" ] && log_result "R-PRIV-ME-$rl" "PASS" "$ex" "$s" "$rl reads Member Private" || log_result "R-PRIV-ME-$rl" "FAIL" "$ex" "$s" "$rl reads Member Private ***LEAK***"
done

echo -e "\n${CYN}--- Manager PUBLIC (id=$MP) ---${RST}"
for p in "Owner:$OT:200" "Admin:$AT:200" "Mgr:$MT:200" "Member:$MeT:200" "Viewer:$VT:200"; do
  IFS=':' read -r rl tk ex <<< "$p"
  s=$(cget "$tk" "$MP")
  [ "$s" = "$ex" ] && log_result "R-PUB-M-$rl" "PASS" "$ex" "$s" "$rl reads Manager Public" || log_result "R-PUB-M-$rl" "FAIL" "$ex" "$s" "$rl reads Manager Public"
done

echo -e "\n${CYN}--- Manager ASSIGNED_ONLY assignee=Viewer (id=$MAV) ---${RST}"
for p in "Owner:$OT:200" "Admin:$AT:200" "Mgr:$MT:200" "Member:$MeT:404" "Viewer:$VT:200"; do
  IFS=':' read -r rl tk ex <<< "$p"
  s=$(cget "$tk" "$MAV")
  [ "$s" = "$ex" ] && log_result "R-ASGN-M-$rl" "PASS" "$ex" "$s" "$rl Mgr AssignedOnly(Viewer)" || log_result "R-ASGN-M-$rl" "FAIL" "$ex" "$s" "$rl Mgr AssignedOnly(Viewer) ***LEAK***"
done

echo -e "\n${CYN}--- Cross-org Product task ---${RST}"
r=$(api POST "$OT" "/tasks" "{\"title\":\"ProdTask\",\"orgId\":\"$PRD\",\"visibility\":\"PUBLIC\",\"priority\":\"LOW\"}")
pr "$r"; PT=$(echo "$B" | jq -r '.id // empty')
echo "Product task id=$PT"
for p in "Owner:$OT:200" "Admin:$AT:404" "Mgr:$MT:404" "Member:$MeT:404" "Viewer:$VT:404"; do
  IFS=':' read -r rl tk ex <<< "$p"
  s=$(cget "$tk" "$PT")
  [ "$s" = "$ex" ] && log_result "R-XORG-$rl" "PASS" "$ex" "$s" "$rl cross-org Product" || log_result "R-XORG-$rl" "FAIL" "$ex" "$s" "$rl cross-org Product ***LEAK***"
done

echo -e "\n${CYN}--- List: Viewer no PRIVATE ---${RST}"
r=$(api GET "$VT" "/tasks?orgId=$ENG&limit=100"); pr "$r"
echo "$B" | jq -r '.items[].visibility' | grep -q "PRIVATE" && log_result "R-LIST-V-PRIV" "FAIL" "no PRIV" "has PRIV" "Viewer sees PRIVATE in list ***LEAK***" || log_result "R-LIST-V-PRIV" "PASS" "no PRIV" "no PRIV" "Viewer no PRIVATE in list"

echo -e "\n${CYN}--- List: Member only own PRIVATE ---${RST}"
r=$(api GET "$MeT" "/tasks?orgId=$ENG&limit=100"); pr "$r"
OTH=$(echo "$B" | jq "[.items[] | select(.visibility==\"PRIVATE\" and .createdById!=\"$MeID\")] | length")
[ "$OTH" = "0" ] && log_result "R-LIST-ME-PRIV" "PASS" "0" "$OTH" "Member only own PRIVATE in list" || log_result "R-LIST-ME-PRIV" "FAIL" "0" "$OTH" "Member sees others PRIVATE ***LEAK***"

echo -e "\n${CYN}--- List: Viewer only own ASSIGNED_ONLY ---${RST}"
r=$(api GET "$VT" "/tasks?orgId=$ENG&limit=100"); pr "$r"
VOTH=$(echo "$B" | jq "[.items[] | select(.visibility==\"ASSIGNED_ONLY\" and .assigneeId!=\"$VID\")] | length")
[ "$VOTH" = "0" ] && log_result "R-LIST-V-ASGN" "PASS" "0" "$VOTH" "Viewer only own ASSIGNED_ONLY" || log_result "R-LIST-V-ASGN" "FAIL" "0" "$VOTH" "Viewer sees others ASSIGNED_ONLY ***LEAK***"

echo -e "\n${CYN}--- List: Member only assigned ASSIGNED_ONLY ---${RST}"
r=$(api GET "$MeT" "/tasks?orgId=$ENG&limit=100"); pr "$r"
MOTH=$(echo "$B" | jq "[.items[] | select(.visibility==\"ASSIGNED_ONLY\" and .assigneeId!=\"$MeID\")] | length")
[ "$MOTH" = "0" ] && log_result "R-LIST-ME-ASGN" "PASS" "0" "$MOTH" "Member only assigned ASSIGNED_ONLY" || log_result "R-LIST-ME-ASGN" "FAIL" "0" "$MOTH" "Member sees unassigned ASSIGNED_ONLY ***LEAK***"

###############################################################################
echo -e "\n${CYN}=== PHASE 3: UPDATE ===${RST}"
###############################################################################

echo -e "\n${CYN}[U1] Owner updates Admin Public${RST}"
r=$(api PATCH "$OT" "/tasks/$AP" "{\"title\":\"Updated by Owner\",\"priority\":\"CRITICAL\"}")
pr "$r"
[ "$S" = "200" ] && log_result "U1" "PASS" "200" "$S" "Owner updates Admin Public" || log_result "U1" "FAIL" "200" "$S" "Owner update Admin Public"

echo -e "\n${CYN}[U2] Admin updates Owner Public${RST}"
r=$(api PATCH "$AT" "/tasks/$TP" "{\"title\":\"Updated by Admin\"}")
pr "$r"
[ "$S" = "200" ] && log_result "U2" "PASS" "200" "$S" "Admin updates Owner Public" || log_result "U2" "FAIL" "200" "$S" "Admin update Owner Public"

echo -e "\n${CYN}[U3] Manager updates Member Public${RST}"
r=$(api PATCH "$MT" "/tasks/$MeP" "{\"status\":\"IN_PROGRESS\"}")
pr "$r"
[ "$S" = "200" ] && log_result "U3" "PASS" "200" "$S" "Manager updates Member Public" || log_result "U3" "FAIL" "200" "$S" "Manager update Member Public"

echo -e "\n${CYN}[U4] Member updates own Public${RST}"
r=$(api PATCH "$MeT" "/tasks/$MeP" "{\"title\":\"Member updated own\"}")
pr "$r"
[ "$S" = "200" ] && log_result "U4" "PASS" "200" "$S" "Member updates own Public" || log_result "U4" "FAIL" "200" "$S" "Member update own"

echo -e "\n${CYN}[U5] Member updates assigned task (Mgr->Member)${RST}"
r=$(api PATCH "$MeT" "/tasks/$MA" "{\"status\":\"IN_PROGRESS\"}")
pr "$r"
[ "$S" = "200" ] && log_result "U5" "PASS" "200" "$S" "Member updates assigned task" || log_result "U5" "FAIL" "200" "$S" "Member update assigned"

echo -e "\n${CYN}[U6] Member updates Admin Public not assigned (expect 404)${RST}"
r=$(api PATCH "$MeT" "/tasks/$AP" "{\"title\":\"Hack\"}")
pr "$r"
[ "$S" = "404" ] && log_result "U6" "PASS" "404" "$S" "Member blocked update Admin unassigned" || log_result "U6" "FAIL" "404" "$S" "Member should NOT update Admin unassigned"

echo -e "\n${CYN}[U7] Viewer updates (expect 404)${RST}"
r=$(api PATCH "$VT" "/tasks/$TP" "{\"title\":\"Hack\"}")
pr "$r"
[ "$S" = "404" ] && log_result "U7" "PASS" "404" "$S" "Viewer blocked update" || log_result "U7" "FAIL" "404" "$S" "Viewer should NOT update"

echo -e "\n${CYN}[U8] Manager updates Admin Private${RST}"
r=$(api PATCH "$MT" "/tasks/$APRIV" "{\"priority\":\"HIGH\"}")
pr "$r"
[ "$S" = "200" ] && log_result "U8" "PASS" "200" "$S" "Manager updates Admin Private" || log_result "U8" "FAIL" "200" "$S" "Manager update Admin Private"

echo -e "\n${CYN}[U9] Member updates Owner Private (expect 404)${RST}"
r=$(api PATCH "$MeT" "/tasks/$TvPRIV" "{\"title\":\"Hack\"}")
pr "$r"
[ "$S" = "404" ] && log_result "U9" "PASS" "404" "$S" "Member blocked Owner Private" || log_result "U9" "FAIL" "404" "$S" "Member should NOT update Owner Private"

echo -e "\n${CYN}[U10] Member reassigns own to Admin (expect 403)${RST}"
r=$(api PATCH "$MeT" "/tasks/$MeP" "{\"assigneeId\":\"$AID\"}")
pr "$r"
[ "$S" = "403" ] && log_result "U10" "PASS" "403" "$S" "Member blocked reassign to other" || log_result "U10" "FAIL" "403" "$S" "Member should NOT reassign"

echo -e "\n${CYN}[U11] Manager reassigns to Viewer${RST}"
r=$(api PATCH "$MT" "/tasks/$MP" "{\"assigneeId\":\"$VID\"}")
pr "$r"
[ "$S" = "200" ] && log_result "U11" "PASS" "200" "$S" "Manager reassigns to Viewer" || log_result "U11" "FAIL" "200" "$S" "Manager reassign"

echo -e "\n${CYN}[U12] Owner changes Member task visibility to PRIVATE${RST}"
r=$(api PATCH "$OT" "/tasks/$MeS" "{\"visibility\":\"PRIVATE\"}")
pr "$r"
[ "$S" = "200" ] && log_result "U12" "PASS" "200" "$S" "Owner changes Member task to PRIVATE" || log_result "U12" "FAIL" "200" "$S" "Owner visibility change"

###############################################################################
echo -e "\n${CYN}=== PHASE 4: DELETE ===${RST}"
###############################################################################

# Disposable tasks
r=$(api POST "$MeT" "/tasks" "{\"title\":\"MeDel\",\"orgId\":\"$ENG\",\"visibility\":\"PUBLIC\",\"priority\":\"LOW\"}")
pr "$r"; MD=$(echo "$B" | jq -r '.id // empty')

r=$(api POST "$AT" "/tasks" "{\"title\":\"AdDel\",\"orgId\":\"$ENG\",\"visibility\":\"PUBLIC\",\"priority\":\"LOW\"}")
pr "$r"; AD=$(echo "$B" | jq -r '.id // empty')

r=$(api POST "$MT" "/tasks" "{\"title\":\"MgDel\",\"orgId\":\"$ENG\",\"visibility\":\"PUBLIC\",\"assigneeId\":\"$MeID\",\"priority\":\"LOW\"}")
pr "$r"; MgAD=$(echo "$B" | jq -r '.id // empty')

echo -e "\n${CYN}[D1] Owner deletes Admin task${RST}"
r=$(api DELETE "$OT" "/tasks/$AD"); pr "$r"
[ "$S" = "200" ] && log_result "D1" "PASS" "200" "$S" "Owner deletes Admin task" || log_result "D1" "FAIL" "200" "$S" "Owner delete Admin"

echo -e "\n${CYN}[D2] Member deletes own task${RST}"
r=$(api DELETE "$MeT" "/tasks/$MD"); pr "$r"
[ "$S" = "200" ] && log_result "D2" "PASS" "200" "$S" "Member deletes own task" || log_result "D2" "FAIL" "200" "$S" "Member delete own"

echo -e "\n${CYN}[D3] Member deletes assigned-not-created (expect 404)${RST}"
r=$(api DELETE "$MeT" "/tasks/$MgAD"); pr "$r"
[ "$S" = "404" ] && log_result "D3" "PASS" "404" "$S" "Member blocked delete assigned-not-created" || log_result "D3" "FAIL" "404" "$S" "Member should NOT delete assigned-not-created"

echo -e "\n${CYN}[D4] Viewer deletes (expect 404)${RST}"
r=$(api DELETE "$VT" "/tasks/$TP"); pr "$r"
[ "$S" = "404" ] && log_result "D4" "PASS" "404" "$S" "Viewer blocked delete" || log_result "D4" "FAIL" "404" "$S" "Viewer should NOT delete"

echo -e "\n${CYN}[D5] Manager deletes Member Public${RST}"
r=$(api DELETE "$MT" "/tasks/$MeP"); pr "$r"
[ "$S" = "200" ] && log_result "D5" "PASS" "200" "$S" "Manager deletes Member Public" || log_result "D5" "FAIL" "200" "$S" "Manager delete Member"

echo -e "\n${CYN}[D6] Admin deletes Owner Public${RST}"
r=$(api DELETE "$AT" "/tasks/$TP"); pr "$r"
[ "$S" = "200" ] && log_result "D6" "PASS" "200" "$S" "Admin deletes Owner Public" || log_result "D6" "FAIL" "200" "$S" "Admin delete Owner"

echo -e "\n${CYN}[D7] Double delete (expect 404)${RST}"
r=$(api DELETE "$MeT" "/tasks/$AD"); pr "$r"
[ "$S" = "404" ] && log_result "D7" "PASS" "404" "$S" "Double delete blocked" || log_result "D7" "FAIL" "404" "$S" "Double delete"

###############################################################################
echo -e "\n${CYN}=== PHASE 5: COMMENTS ===${RST}"
###############################################################################

r=$(api POST "$AT" "/tasks" "{\"title\":\"CmtTest\",\"orgId\":\"$ENG\",\"visibility\":\"PUBLIC\",\"priority\":\"LOW\"}")
pr "$r"; CT=$(echo "$B" | jq -r '.id // empty')

echo -e "\n${CYN}[CM1] Member comments on Public${RST}"
r=$(api POST "$MeT" "/tasks/$CT/comments" "{\"comment\":\"Member comment\"}")
pr "$r"
[ "$S" = "201" ] && log_result "CM1" "PASS" "201" "$S" "Member comments on Public" || log_result "CM1" "FAIL" "201" "$S" "Member comment"

echo -e "\n${CYN}[CM2] Viewer comments (expect 403)${RST}"
r=$(api POST "$VT" "/tasks/$CT/comments" "{\"comment\":\"Viewer comment\"}")
pr "$r"
[ "$S" = "403" ] && log_result "CM2" "PASS" "403" "$S" "Viewer blocked comment" || log_result "CM2" "FAIL" "403" "$S" "Viewer should NOT comment"

echo -e "\n${CYN}[CM3] Viewer reads activity on Public${RST}"
r=$(api GET "$VT" "/tasks/$CT/activity"); pr "$r"
[ "$S" = "200" ] && log_result "CM3" "PASS" "200" "$S" "Viewer reads activity" || log_result "CM3" "FAIL" "200" "$S" "Viewer activity"

echo -e "\n${CYN}[CM4] Member comments on Owner Private (expect 404)${RST}"
r=$(api POST "$MeT" "/tasks/$TvPRIV/comments" "{\"comment\":\"Leak\"}")
pr "$r"
[ "$S" = "404" ] && log_result "CM4" "PASS" "404" "$S" "Member blocked comment invisible" || log_result "CM4" "FAIL" "404" "$S" "Member should NOT comment invisible"

echo -e "\n${CYN}[CM5] Owner comments on own Private${RST}"
r=$(api POST "$OT" "/tasks/$TvPRIV/comments" "{\"comment\":\"Owner comment\"}")
pr "$r"
[ "$S" = "201" ] && log_result "CM5" "PASS" "201" "$S" "Owner comments on own Private" || log_result "CM5" "FAIL" "201" "$S" "Owner comment own Private"

echo -e "\n${CYN}[CM6] Member reads activity on assigned ASSIGNED_ONLY task${RST}"
r=$(api GET "$MeT" "/tasks/$TvA/activity"); pr "$r"
[ "$S" = "200" ] && log_result "CM6" "PASS" "200" "$S" "Member reads activity assigned task" || log_result "CM6" "FAIL" "200" "$S" "Member activity assigned"

###############################################################################
echo -e "\n${CYN}=== SUMMARY ===${RST}"
echo -e "${GRN}PASS: $PASS${RST}  ${RED}FAIL: $FAIL${RST}  ${YEL}WARN: $WARN${RST}  Total: $((PASS+FAIL+WARN))"
if [ $FAIL -gt 0 ]; then
  echo -e "\n${RED}=== FAILURES ===${RST}"
  grep "FAIL" "$RESULTS"
fi
echo ""
echo "Full results saved to $RESULTS"
