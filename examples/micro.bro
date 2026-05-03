# Smallest useful diagram — three nodes, two edges.

actor user "User"
service api "API"
db data "Database"

edge user -> api
edge api -> data
