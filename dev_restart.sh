#!/bin/sh
docker-compose -f docker-compose-start.yaml down

sleep 1

#sudo kubectl --kubeconfig /var/lib/minikube/.kube/config delete namespace first
cd /cello

sleep 1

for i in `ls ./`
do
	echo "$i"
	if [ "$i" = "fabric-1.0" -o "$i" = "fabric-1.1" -o "$i" = "fabric-1.2" ]; then
		continue
	else
		sudo rm $i -rf
	fi
done

sleep 1

sudo rm /opt/cello/*mongo* -rf
cd -
docker-compose -f docker-compose-start.yaml up -d

